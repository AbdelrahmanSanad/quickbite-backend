import { Injectable } from '@nestjs/common';
import { Product as PrismaProduct } from '../../../../../generated/prisma';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { Product } from '../../domain/product';
import {
  CreateProductData,
  ProductRepository,
  ProductWithOwner,
  UpdateProductData,
} from '../../domain/ports/product-repository.port';

/**
 * Prisma-backed {@link ProductRepository}. Reads filter soft-deleted products
 * AND products whose category OR the category's restaurant is soft-deleted (§9 —
 * the filter climbs the full two-level chain). `price` (Decimal(10,2)) is mapped
 * to a canonical 2dp string in {@link toDomain}, never a float. No unique
 * constraint exists on products, so there is no P2002/409 translation; the DB
 * `CHECK (price > 0)` is unreachable given DTO validation and is left to surface
 * as a clean 5xx if ever hit.
 */
@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductData): Promise<Product> {
    const created = await this.prisma.product.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        isAvailable: data.isAvailable,
        sortOrder: data.sortOrder,
      },
    });
    return this.toDomain(created);
  }

  async findByIdWithOwner(id: string): Promise<ProductWithOwner | null> {
    const found = await this.prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
        category: { deletedAt: null, restaurant: { deletedAt: null } },
      },
      include: {
        category: { select: { restaurant: { select: { ownerId: true } } } },
      },
    });
    if (!found) {
      return null;
    }
    return {
      product: this.toDomain(found),
      ownerId: found.category.restaurant.ownerId,
    };
  }

  async listByCategory(categoryId: string): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        categoryId,
        deletedAt: null,
        category: { deletedAt: null, restaurant: { deletedAt: null } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        isAvailable: data.isAvailable,
        sortOrder: data.sortOrder,
      },
    });
    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(row: PrismaProduct): Product {
    return {
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      // Decimal(10,2) -> canonical 2dp string (exact; normalizes "12.5" -> "12.50").
      price: row.price.toFixed(2),
      isAvailable: row.isAvailable,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

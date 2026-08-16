import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Category as PrismaCategory,
} from '../../../../../generated/prisma';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { Category } from '../../domain/category';
import { DuplicateCategoryError } from '../../domain/errors/domain.error';
import {
  CategoryRepository,
  CategoryWithOwner,
  CreateCategoryData,
  UpdateCategoryData,
} from '../../domain/ports/category-repository.port';

/**
 * Prisma-backed {@link CategoryRepository}. Reads filter soft-deleted rows AND
 * rows under a soft-deleted restaurant (§9). The live-name uniqueness is a
 * partial-unique index (`(restaurant_id, name) WHERE deleted_at IS NULL`) with
 * no Prisma `@@unique`; a violation surfaces as P2002, translated here to the
 * domain {@link DuplicateCategoryError}. The translation is intentionally
 * narrow — any other error rethrows so real faults surface as a clean 5xx.
 */
@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryData): Promise<Category> {
    try {
      const created = await this.prisma.category.create({
        data: {
          restaurantId: data.restaurantId,
          name: data.name,
          sortOrder: data.sortOrder,
        },
      });
      return this.toDomain(created);
    } catch (error) {
      throw this.translateDuplicate(error);
    }
  }

  async findByIdWithOwner(id: string): Promise<CategoryWithOwner | null> {
    const found = await this.prisma.category.findFirst({
      where: { id, deletedAt: null, restaurant: { deletedAt: null } },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!found) {
      return null;
    }
    return {
      category: this.toDomain(found),
      ownerId: found.restaurant.ownerId,
    };
  }

  async listByRestaurant(restaurantId: string): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({
      where: { restaurantId, deletedAt: null, restaurant: { deletedAt: null } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: { name: data.name, sortOrder: data.sortOrder },
      });
      return this.toDomain(updated);
    } catch (error) {
      throw this.translateDuplicate(error);
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * P2002 (unique violation) → domain 409; everything else propagates as-is.
   *
   * INVARIANT: `categories` has exactly ONE unique constraint that a
   * create/update can hit — the partial index
   * `categories_restaurant_id_name_active_key (restaurant_id, name) WHERE deleted_at IS NULL`
   * (the UUID PK never collides on an insert/by-id update). So any P2002 here is
   * a duplicate live name. If a future migration adds another unique constraint
   * to `categories`, narrow this by `error.meta.target` before mapping, or this
   * would mis-report that violation as a category-name 409.
   */
  private translateDuplicate(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new DuplicateCategoryError();
    }
    return error;
  }

  private toDomain(row: PrismaCategory): Category {
    return {
      id: row.id,
      restaurantId: row.restaurantId,
      name: row.name,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

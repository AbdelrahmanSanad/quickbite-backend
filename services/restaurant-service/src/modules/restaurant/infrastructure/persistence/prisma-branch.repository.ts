import { Injectable } from '@nestjs/common';
import { Branch as PrismaBranch } from '../../../../../generated/prisma';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { Branch } from '../../domain/branch';
import {
  BranchRepository,
  BranchWithOwner,
  CreateBranchData,
  UpdateBranchData,
} from '../../domain/ports/branch-repository.port';

/**
 * Prisma-backed {@link BranchRepository}. Reads exclude soft-deleted branches
 * AND branches whose parent restaurant is soft-deleted (§9 — the filter climbs
 * to `restaurant.deletedAt`). `softDelete` stamps `deletedAt`.
 */
@Injectable()
export class PrismaBranchRepository implements BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBranchData): Promise<Branch> {
    const created = await this.prisma.branch.create({
      data: {
        restaurantId: data.restaurantId,
        name: data.name,
        address: data.address,
        phone: data.phone ?? null,
      },
    });
    return this.toDomain(created);
  }

  async findByIdWithOwner(id: string): Promise<BranchWithOwner | null> {
    const found = await this.prisma.branch.findFirst({
      where: { id, deletedAt: null, restaurant: { deletedAt: null } },
      include: { restaurant: { select: { ownerId: true } } },
    });
    if (!found) {
      return null;
    }
    return { branch: this.toDomain(found), ownerId: found.restaurant.ownerId };
  }

  async listByRestaurant(restaurantId: string): Promise<Branch[]> {
    // Self-enforce the up-the-chain rule (`restaurant.deletedAt IS NULL`) so the
    // repository upholds §9 on its own, not only via the use-case's parent check.
    const rows = await this.prisma.branch.findMany({
      where: { restaurantId, deletedAt: null, restaurant: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, data: UpdateBranchData): Promise<Branch> {
    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        isActive: data.isActive,
      },
    });
    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(row: PrismaBranch): Branch {
    return {
      id: row.id,
      restaurantId: row.restaurantId,
      name: row.name,
      address: row.address,
      phone: row.phone,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

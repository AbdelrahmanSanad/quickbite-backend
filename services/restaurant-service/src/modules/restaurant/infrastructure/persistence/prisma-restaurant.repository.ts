import { Injectable } from '@nestjs/common';
import { Restaurant as PrismaRestaurant } from '../../../../../generated/prisma';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { Restaurant } from '../../domain/restaurant';
import {
  CreateRestaurantData,
  RestaurantRepository,
  UpdateRestaurantData,
} from '../../domain/ports/restaurant-repository.port';

/**
 * Prisma-backed {@link RestaurantRepository}. Reads exclude soft-deleted rows
 * (`deletedAt: null`); `softDelete` stamps `deletedAt` instead of removing the
 * row. `status` and timestamps come from schema defaults on create.
 */
@Injectable()
export class PrismaRestaurantRepository implements RestaurantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRestaurantData): Promise<Restaurant> {
    const created = await this.prisma.restaurant.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        description: data.description ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Restaurant | null> {
    // findFirst (not findUnique) — the `deletedAt` predicate isn't part of the
    // unique key.
    const found = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
    });
    return found ? this.toDomain(found) : null;
  }

  async update(id: string, data: UpdateRestaurantData): Promise<Restaurant> {
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        email: data.email,
      },
    });
    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.restaurant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(row: PrismaRestaurant): Restaurant {
    return {
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      description: row.description,
      status: row.status,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
import { Product } from '../domain/product';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import { PRODUCT_REPOSITORY } from '../domain/ports/product-repository.port';
import type { ProductRepository } from '../domain/ports/product-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface CreateProductCommand {
  categoryId: string;
  actor: Actor;
  name: string;
  description?: string | null;
  price: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

/**
 * Adds a product to a category. Loads the parent category (which resolves the
 * restaurant's ownerId and enforces category-live + restaurant-live up the
 * chain) first: 404 before ownership; the caller must own it (ADMIN bypasses).
 */
@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const parent = await this.categories.findByIdWithOwner(command.categoryId);
    if (!parent) {
      throw new CategoryNotFoundError();
    }
    assertActorOwns(parent.ownerId, command.actor);

    // TODO(Task 9): invalidate restaurant:{id}:menu after a product write.
    return this.products.create({
      categoryId: command.categoryId,
      name: command.name,
      description: command.description ?? null,
      price: command.price,
      isAvailable: command.isAvailable,
      sortOrder: command.sortOrder,
    });
  }
}

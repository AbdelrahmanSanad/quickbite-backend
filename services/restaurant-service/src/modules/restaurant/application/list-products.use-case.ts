import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
import { Product } from '../domain/product';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import { PRODUCT_REPOSITORY } from '../domain/ports/product-repository.port';
import type { ProductRepository } from '../domain/ports/product-repository.port';

/**
 * Lists a category's non-deleted products (ordered by sortOrder then name).
 * Public. 404s if the parent category is missing/soft-deleted or under a
 * soft-deleted restaurant, so products of a hidden category don't leak.
 */
@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(categoryId: string): Promise<Product[]> {
    const parent = await this.categories.findByIdWithOwner(categoryId);
    if (!parent) {
      throw new CategoryNotFoundError();
    }
    return this.products.listByCategory(categoryId);
  }
}

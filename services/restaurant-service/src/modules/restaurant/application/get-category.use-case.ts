import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
import { Category } from '../domain/category';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type { CategoryRepository } from '../domain/ports/category-repository.port';

/**
 * Reads a single category. Public. Invisible (→ 404) when the category OR its
 * parent restaurant is soft-deleted (the repository filters up the chain).
 */
@Injectable()
export class GetCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(id: string): Promise<Category> {
    const found = await this.categories.findByIdWithOwner(id);
    if (!found) {
      throw new CategoryNotFoundError();
    }
    return found.category;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
import { Category } from '../domain/category';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type {
  CategoryRepository,
  UpdateCategoryData,
} from '../domain/ports/category-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface UpdateCategoryCommand {
  id: string;
  actor: Actor;
  data: UpdateCategoryData;
}

/**
 * Updates a category. Loads it (with the parent's ownerId, up-the-chain visible)
 * first: missing/hidden → 404 before ownership; cross-owner → 403. Renaming into
 * a live sibling's name → 409 (raised by the repository).
 */
@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(command: UpdateCategoryCommand): Promise<Category> {
    const found = await this.categories.findByIdWithOwner(command.id);
    if (!found) {
      throw new CategoryNotFoundError();
    }
    assertActorOwns(found.ownerId, command.actor);

    // TODO(Task 9): invalidate restaurant:{id}:menu after a category write.
    return this.categories.update(command.id, command.data);
  }
}

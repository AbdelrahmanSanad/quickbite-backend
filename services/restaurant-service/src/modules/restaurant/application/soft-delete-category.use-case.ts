import { Inject, Injectable } from '@nestjs/common';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface SoftDeleteCategoryCommand {
  id: string;
  actor: Actor;
}

/**
 * Soft-deletes a category (sets `deletedAt`), freeing its name for reuse (the
 * uniqueness index is partial). Same load-then-authorize order: 404 for a
 * missing/hidden category, 403 for a non-owner.
 */
@Injectable()
export class SoftDeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(command: SoftDeleteCategoryCommand): Promise<void> {
    const found = await this.categories.findByIdWithOwner(command.id);
    if (!found) {
      throw new CategoryNotFoundError();
    }
    assertActorOwns(found.ownerId, command.actor);

    // TODO(Task 9): invalidate restaurant:{id}:menu after a category write.
    await this.categories.softDelete(command.id);
  }
}

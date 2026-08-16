import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { Category } from '../domain/category';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface CreateCategoryCommand {
  restaurantId: string;
  actor: Actor;
  name: string;
  sortOrder?: number;
}

/**
 * Adds a category to a restaurant. Loads the parent first (404 before
 * ownership); the caller must own it (ADMIN bypasses). A duplicate live name is
 * rejected with 409 by the repository (partial-unique index).
 */
@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<Category> {
    const restaurant = await this.restaurants.findById(command.restaurantId);
    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }
    assertActorOwns(restaurant.ownerId, command.actor);

    // TODO(Task 9): invalidate restaurant:{id}:menu after a category write.
    return this.categories.create({
      restaurantId: command.restaurantId,
      name: command.name,
      sortOrder: command.sortOrder ?? 0,
    });
  }
}

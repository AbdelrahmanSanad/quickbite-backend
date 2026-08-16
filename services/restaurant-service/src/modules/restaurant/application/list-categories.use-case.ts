import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { Category } from '../domain/category';
import { CATEGORY_REPOSITORY } from '../domain/ports/category-repository.port';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';

/**
 * Lists a restaurant's non-deleted categories (ordered by sortOrder then name).
 * Public. 404s if the parent restaurant is missing/soft-deleted so categories of
 * a hidden restaurant don't leak.
 */
@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: CategoryRepository,
  ) {}

  async execute(restaurantId: string): Promise<Category[]> {
    const restaurant = await this.restaurants.findById(restaurantId);
    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }
    return this.categories.listByRestaurant(restaurantId);
  }
}

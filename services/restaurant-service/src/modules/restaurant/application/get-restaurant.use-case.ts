import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { Restaurant } from '../domain/restaurant';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';

/**
 * Reads a single restaurant profile. Public (no auth). Soft-deleted restaurants
 * are invisible — the repository filters `deletedAt IS NULL`, so they surface as
 * a 404 exactly like a non-existent id.
 */
@Injectable()
export class GetRestaurantUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
  ) {}

  async execute(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurants.findById(id);
    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }
    return restaurant;
  }
}

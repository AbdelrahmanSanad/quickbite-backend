import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { Restaurant } from '../domain/restaurant';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type {
  RestaurantRepository,
  UpdateRestaurantData,
} from '../domain/ports/restaurant-repository.port';
import { Actor, assertCanManage } from './ownership';

export interface UpdateRestaurantCommand {
  id: string;
  actor: Actor;
  data: UpdateRestaurantData;
}

/**
 * Updates an owner's restaurant profile. Loads the row first so a missing
 * restaurant is a 404 before ownership is ever considered (a non-owner learns
 * only that access is denied, not the row's contents).
 */
@Injectable()
export class UpdateRestaurantUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
  ) {}

  async execute(command: UpdateRestaurantCommand): Promise<Restaurant> {
    const existing = await this.restaurants.findById(command.id);
    if (!existing) {
      throw new RestaurantNotFoundError();
    }
    assertCanManage(existing, command.actor);

    const updated = await this.restaurants.update(command.id, command.data);
    // TODO(Task 9): invalidate the restaurant menu cache after a profile change.
    return updated;
  }
}

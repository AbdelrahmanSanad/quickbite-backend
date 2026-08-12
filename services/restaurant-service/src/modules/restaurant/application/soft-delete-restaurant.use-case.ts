import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';
import { Actor, assertCanManage } from './ownership';

export interface SoftDeleteRestaurantCommand {
  id: string;
  actor: Actor;
}

/**
 * Soft-deletes an owner's restaurant (sets `deletedAt`). The row is retained
 * for auditability; every read filters it out. Same load-then-authorize order
 * as update: 404 for a missing row, 403 for a non-owner.
 */
@Injectable()
export class SoftDeleteRestaurantUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
  ) {}

  async execute(command: SoftDeleteRestaurantCommand): Promise<void> {
    const existing = await this.restaurants.findById(command.id);
    if (!existing) {
      throw new RestaurantNotFoundError();
    }
    assertCanManage(existing, command.actor);

    await this.restaurants.softDelete(command.id);
    // TODO(Task 9): invalidate the restaurant menu cache after a delete.
  }
}

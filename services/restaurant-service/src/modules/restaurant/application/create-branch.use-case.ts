import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { Branch } from '../domain/branch';
import { BRANCH_REPOSITORY } from '../domain/ports/branch-repository.port';
import type { BranchRepository } from '../domain/ports/branch-repository.port';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface CreateBranchCommand {
  restaurantId: string;
  actor: Actor;
  name: string;
  address: string;
  phone?: string | null;
}

/**
 * Adds a branch to a restaurant. Loads the parent first so a missing/soft-deleted
 * restaurant is a 404 before ownership is considered; the caller must own the
 * parent (ADMIN bypasses).
 */
@Injectable()
export class CreateBranchUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepository,
  ) {}

  async execute(command: CreateBranchCommand): Promise<Branch> {
    const restaurant = await this.restaurants.findById(command.restaurantId);
    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }
    assertActorOwns(restaurant.ownerId, command.actor);

    return this.branches.create({
      restaurantId: command.restaurantId,
      name: command.name,
      address: command.address,
      phone: command.phone ?? null,
    });
  }
}

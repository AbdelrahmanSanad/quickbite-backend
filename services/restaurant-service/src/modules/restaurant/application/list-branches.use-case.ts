import { Inject, Injectable } from '@nestjs/common';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import { Branch } from '../domain/branch';
import { BRANCH_REPOSITORY } from '../domain/ports/branch-repository.port';
import type { BranchRepository } from '../domain/ports/branch-repository.port';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';

/**
 * Lists a restaurant's non-deleted branches. Public. 404s if the parent
 * restaurant is missing/soft-deleted (so branches of a hidden restaurant don't
 * leak); otherwise returns the array (possibly empty).
 */
@Injectable()
export class ListBranchesUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepository,
  ) {}

  async execute(restaurantId: string): Promise<Branch[]> {
    const restaurant = await this.restaurants.findById(restaurantId);
    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }
    return this.branches.listByRestaurant(restaurantId);
  }
}

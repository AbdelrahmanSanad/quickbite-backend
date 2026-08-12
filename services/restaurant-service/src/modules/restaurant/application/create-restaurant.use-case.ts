import { Inject, Injectable } from '@nestjs/common';
import { Restaurant } from '../domain/restaurant';
import { RESTAURANT_REPOSITORY } from '../domain/ports/restaurant-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';

export interface CreateRestaurantCommand {
  /** Taken from the authenticated identity — NEVER from the request body. */
  ownerId: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Creates a restaurant owned by the authenticated caller. Status defaults to
 * ACTIVE (no admin-approval flow in the MVP — §4).
 */
@Injectable()
export class CreateRestaurantUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurants: RestaurantRepository,
  ) {}

  execute(command: CreateRestaurantCommand): Promise<Restaurant> {
    return this.restaurants.create({
      ownerId: command.ownerId,
      name: command.name,
      description: command.description ?? null,
      phone: command.phone ?? null,
      email: command.email ?? null,
    });
  }
}

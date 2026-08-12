import { Restaurant } from '../restaurant';

export interface CreateRestaurantData {
  ownerId: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateRestaurantData {
  name?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Persistence boundary for restaurants. Implemented by the infrastructure
 * layer. Every read MUST exclude soft-deleted rows (`deletedAt IS NULL`) so a
 * deleted restaurant is indistinguishable from one that never existed.
 */
export interface RestaurantRepository {
  create(data: CreateRestaurantData): Promise<Restaurant>;
  /** Returns the restaurant only if it exists and is not soft-deleted. */
  findById(id: string): Promise<Restaurant | null>;
  update(id: string, data: UpdateRestaurantData): Promise<Restaurant>;
  /** Sets `deletedAt = now()`; the row is retained for auditability. */
  softDelete(id: string): Promise<void>;
}

export const RESTAURANT_REPOSITORY = Symbol('RESTAURANT_REPOSITORY');

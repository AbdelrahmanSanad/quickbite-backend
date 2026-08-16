import { Category } from '../category';

export interface CreateCategoryData {
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface UpdateCategoryData {
  name?: string;
  sortOrder?: number;
}

/** A category together with its parent restaurant's owner id, for authorization. */
export interface CategoryWithOwner {
  category: Category;
  ownerId: string;
}

/**
 * Persistence boundary for categories. Reads exclude soft-deleted rows AND rows
 * whose parent restaurant is soft-deleted (§9). `create`/`update` throw
 * {@link DuplicateCategoryError} when the live-name uniqueness is violated (the
 * repository translates the DB's unique-violation into the domain error).
 */
export interface CategoryRepository {
  create(data: CreateCategoryData): Promise<Category>;
  /** Branch/update/delete read: category + parent's ownerId, both live. */
  findByIdWithOwner(id: string): Promise<CategoryWithOwner | null>;
  /** Non-deleted categories of a live restaurant, ordered for display. */
  listByRestaurant(restaurantId: string): Promise<Category[]>;
  update(id: string, data: UpdateCategoryData): Promise<Category>;
  softDelete(id: string): Promise<void>;
}

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

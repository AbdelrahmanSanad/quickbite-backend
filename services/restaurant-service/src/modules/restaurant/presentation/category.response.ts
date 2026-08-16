import { Category } from '../domain/category';

/** Public/owner-facing category shape. `deletedAt` is never exposed. */
export interface CategoryResponse {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Maps a domain Category to its API response, dropping the soft-delete marker. */
export function toCategoryResponse(c: Category): CategoryResponse {
  return {
    id: c.id,
    restaurantId: c.restaurantId,
    name: c.name,
    sortOrder: c.sortOrder,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

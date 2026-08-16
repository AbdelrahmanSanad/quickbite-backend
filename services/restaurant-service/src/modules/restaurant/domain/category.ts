/**
 * Category — groups products within a restaurant's menu. Child of the Restaurant
 * aggregate: ownership and soft-delete visibility resolve up to the parent
 * restaurant. Name is unique among a restaurant's LIVE categories (partial-unique
 * index), so a soft-deleted name may be reused. Transport-/ORM-agnostic.
 */
export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

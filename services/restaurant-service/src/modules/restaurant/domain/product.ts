/**
 * Product — a menu item with a single price. Leaf of the aggregate: ownership
 * and soft-delete visibility resolve up the chain product → category →
 * restaurant. `price` is a 2dp decimal string (e.g. "12.50") — money is kept as
 * a string, never a float, to avoid precision loss. Transport-/ORM-agnostic.
 */
export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

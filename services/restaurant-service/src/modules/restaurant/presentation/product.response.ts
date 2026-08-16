import { Product } from '../domain/product';

/**
 * Public/owner-facing product shape. `price` is a 2dp string ("12.50") — clients
 * must parse it for arithmetic. `deletedAt` is never exposed.
 */
export interface ProductResponse {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Maps a domain Product to its API response, dropping the soft-delete marker. */
export function toProductResponse(p: Product): ProductResponse {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    price: p.price,
    isAvailable: p.isAvailable,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

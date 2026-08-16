import { Product } from '../product';

export interface CreateProductData {
  categoryId: string;
  name: string;
  description?: string | null;
  /** Positive amount; the DB stores it as Decimal(10,2). */
  price: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string | null;
  price?: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

/** A product together with its restaurant's owner id (resolved via category). */
export interface ProductWithOwner {
  product: Product;
  ownerId: string;
}

/**
 * Persistence boundary for products. Reads exclude soft-deleted rows AND rows
 * whose category OR the category's restaurant is soft-deleted (§9 — the filter
 * climbs the full two-level chain).
 */
export interface ProductRepository {
  create(data: CreateProductData): Promise<Product>;
  /** Product + parent's ownerId, all three levels live. Backs get/update/delete. */
  findByIdWithOwner(id: string): Promise<ProductWithOwner | null>;
  /** Non-deleted products of a live category, ordered for display. */
  listByCategory(categoryId: string): Promise<Product[]>;
  update(id: string, data: UpdateProductData): Promise<Product>;
  softDelete(id: string): Promise<void>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

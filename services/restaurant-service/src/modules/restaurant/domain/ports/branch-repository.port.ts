import { Branch } from '../branch';

export interface CreateBranchData {
  restaurantId: string;
  name: string;
  address: string;
  phone?: string | null;
}

export interface UpdateBranchData {
  name?: string;
  address?: string;
  phone?: string | null;
  isActive?: boolean;
}

/** A branch together with its parent restaurant's owner id, for authorization. */
export interface BranchWithOwner {
  branch: Branch;
  ownerId: string;
}

/**
 * Persistence boundary for branches. Every read MUST exclude soft-deleted rows
 * AND rows whose parent restaurant is soft-deleted (§9 — soft delete does not
 * cascade, so visibility is filtered up the chain in the query).
 */
export interface BranchRepository {
  create(data: CreateBranchData): Promise<Branch>;
  /**
   * Returns the branch and its parent's ownerId only if BOTH the branch and its
   * parent restaurant are live (not soft-deleted). Backs get/update/delete.
   */
  findByIdWithOwner(id: string): Promise<BranchWithOwner | null>;
  /** Non-deleted branches of a restaurant, ordered for stable listing. */
  listByRestaurant(restaurantId: string): Promise<Branch[]>;
  update(id: string, data: UpdateBranchData): Promise<Branch>;
  softDelete(id: string): Promise<void>;
}

export const BRANCH_REPOSITORY = Symbol('BRANCH_REPOSITORY');

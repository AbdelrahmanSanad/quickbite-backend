import { Branch } from '../domain/branch';

/** Public/owner-facing branch shape. `deletedAt` is never exposed. */
export interface BranchResponse {
  id: string;
  restaurantId: string;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Maps a domain Branch to its API response, dropping the soft-delete marker. */
export function toBranchResponse(b: Branch): BranchResponse {
  return {
    id: b.id,
    restaurantId: b.restaurantId,
    name: b.name,
    address: b.address,
    phone: b.phone,
    isActive: b.isActive,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

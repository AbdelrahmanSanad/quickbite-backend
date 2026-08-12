import { Restaurant, RestaurantStatus } from '../domain/restaurant';

/** Public/owner-facing restaurant shape. `deletedAt` is never exposed. */
export interface RestaurantResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: RestaurantStatus;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Maps a domain Restaurant to its API response, dropping the soft-delete marker. */
export function toRestaurantResponse(r: Restaurant): RestaurantResponse {
  return {
    id: r.id,
    ownerId: r.ownerId,
    name: r.name,
    description: r.description,
    status: r.status,
    phone: r.phone,
    email: r.email,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

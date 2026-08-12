/**
 * Restaurant aggregate root — the ownable business a RESTAURANT_OWNER runs.
 *
 * Transport- and ORM-agnostic: no NestJS, no Prisma imports. `ownerId` is the
 * Auth user's UUID with NO cross-database foreign key (Restaurant Service never
 * touches auth_db). Soft delete is expressed via `deletedAt`.
 */
export const RestaurantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type RestaurantStatus =
  (typeof RestaurantStatus)[keyof typeof RestaurantStatus];

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: RestaurantStatus;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

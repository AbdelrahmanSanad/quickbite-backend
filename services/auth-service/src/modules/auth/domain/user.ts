/**
 * Domain model for a platform identity — framework- and ORM-agnostic.
 * Enums use the const-object pattern (string-literal unions) so they stay
 * structurally compatible with the Prisma-generated enums without importing
 * the ORM into the domain.
 */

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_OWNER: 'RESTAURANT_OWNER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Platform roles carried in the access token's `role` claim.
 * String-literal union (const-object) so it stays compatible with the value
 * signed by the Auth Service without importing anything from it.
 */
export const Role = {
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_OWNER: 'RESTAURANT_OWNER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

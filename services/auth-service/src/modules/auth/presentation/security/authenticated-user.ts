/**
 * The authenticated identity carried by a validated access token.
 * This is what `request.user` (and `@CurrentUser()`) resolves to — derived
 * purely from the JWT payload, with no database lookup.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

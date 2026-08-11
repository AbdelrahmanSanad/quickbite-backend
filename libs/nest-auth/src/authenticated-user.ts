/**
 * The authenticated identity derived from a validated access token.
 * This is what `request.user` and `@CurrentUser()` resolve to — no DB lookup.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

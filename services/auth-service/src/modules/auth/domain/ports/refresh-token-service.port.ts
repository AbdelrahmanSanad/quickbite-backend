export interface IssuedRefreshToken {
  /** Raw token returned to the client (never stored). */
  token: string;
  /** Deterministic hash stored in the session for later lookup. */
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Owns all refresh-token policy: generation, hashing, and TTL.
 * `hash` is exposed so the refresh flow (2.2) can look a session up by hashing
 * the presented token.
 */
export interface RefreshTokenService {
  issue(): IssuedRefreshToken;
  hash(rawToken: string): string;
}

export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
}

export interface IssuedAccessToken {
  token: string;
  expiresInSeconds: number;
}

/** Issues short-lived access tokens (JWT in infrastructure). */
export interface AccessTokenService {
  issue(payload: AccessTokenPayload): Promise<IssuedAccessToken>;
}

export const ACCESS_TOKEN_SERVICE = Symbol('ACCESS_TOKEN_SERVICE');

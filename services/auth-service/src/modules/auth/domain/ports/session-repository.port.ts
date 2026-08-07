import { Session } from '../session';

export interface CreateSessionData {
  userId: string;
  refreshTokenHash: string;
  deviceName?: string | null;
  deviceType?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
}

/** Persistence boundary for sessions. */
export interface SessionRepository {
  create(data: CreateSessionData): Promise<Session>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null>;
  /** Replace the refresh token hash and slide expiry; bumps last_used_at. */
  rotate(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  /** Soft-revoke a single active session (sets revoked_at). Idempotent. */
  revoke(sessionId: string): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

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
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

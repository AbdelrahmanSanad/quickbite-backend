/** A single authenticated login (one refresh token / device). */
export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

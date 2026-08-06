import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import {
  IssuedRefreshToken,
  RefreshTokenService,
} from '../../domain/ports/refresh-token-service.port';

/**
 * Opaque 256-bit refresh token, stored as its SHA-256 hash.
 * SHA-256 (not Argon2) because the token is already high-entropy and the hash
 * must be deterministic so the refresh flow can look the session up by it.
 */
@Injectable()
export class Sha256RefreshTokenService implements RefreshTokenService {
  constructor(private readonly config: ConfigService) {}

  issue(): IssuedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hash(token);
    const ttlSeconds = Number(this.config.getOrThrow('REFRESH_TTL'));
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return { token, tokenHash, expiresAt };
  }

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}

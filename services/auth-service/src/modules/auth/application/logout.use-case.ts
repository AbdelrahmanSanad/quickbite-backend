import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_SERVICE } from '../domain/ports/refresh-token-service.port';
import type { RefreshTokenService } from '../domain/ports/refresh-token-service.port';
import { SESSION_REPOSITORY } from '../domain/ports/session-repository.port';
import type { SessionRepository } from '../domain/ports/session-repository.port';

export interface LogoutCommand {
  refreshToken: string;
}

/**
 * Revokes the session behind the presented refresh token.
 *
 * Idempotent: if the token is unknown / already revoked / expired, this is a
 * no-op and still succeeds — the goal ("this token is no longer valid") holds
 * either way, and it leaks nothing about token validity.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const hash = this.refreshTokens.hash(command.refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(hash);
    if (session && session.revokedAt === null) {
      await this.sessions.revoke(session.id);
    }
  }
}

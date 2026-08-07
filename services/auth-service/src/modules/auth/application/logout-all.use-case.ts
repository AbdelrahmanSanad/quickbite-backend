import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_SERVICE } from '../domain/ports/refresh-token-service.port';
import type { RefreshTokenService } from '../domain/ports/refresh-token-service.port';
import { SESSION_REPOSITORY } from '../domain/ports/session-repository.port';
import type { SessionRepository } from '../domain/ports/session-repository.port';

export interface LogoutAllCommand {
  refreshToken: string;
}

export interface LogoutAllResult {
  revokedCount: number;
}

/**
 * Revokes every active session for the user behind the presented refresh token,
 * including the current one ("sign out everywhere").
 *
 * The token must resolve to an ACTIVE session to identify the user; an unknown /
 * revoked / expired token is a no-op that still succeeds (idempotent).
 */
@Injectable()
export class LogoutAllUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async execute(command: LogoutAllCommand): Promise<LogoutAllResult> {
    const hash = this.refreshTokens.hash(command.refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(hash);

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return { revokedCount: 0 };
    }

    const revokedCount = await this.sessions.revokeAllByUserId(session.userId);
    return { revokedCount };
  }
}

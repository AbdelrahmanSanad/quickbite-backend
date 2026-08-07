import { Inject, Injectable } from '@nestjs/common';
import {
  AccountNotActiveError,
  InvalidRefreshTokenError,
} from '../domain/errors/domain.error';
import { ACCESS_TOKEN_SERVICE } from '../domain/ports/access-token.service.port';
import type { AccessTokenService } from '../domain/ports/access-token.service.port';
import { REFRESH_TOKEN_SERVICE } from '../domain/ports/refresh-token-service.port';
import type { RefreshTokenService } from '../domain/ports/refresh-token-service.port';
import { SESSION_REPOSITORY } from '../domain/ports/session-repository.port';
import type { SessionRepository } from '../domain/ports/session-repository.port';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';
import type { UserRepository } from '../domain/ports/user-repository.port';
import { UserStatus } from '../domain/user';

export interface RefreshTokenCommand {
  refreshToken: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/**
 * Rotates a session's refresh token and issues a fresh access token.
 *
 * The presented token is hashed and looked up; a missing/revoked/expired
 * session is rejected uniformly. On success the refresh token is rotated
 * (old hash overwritten — a replayed old token no longer resolves) and expiry
 * slides forward.
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: AccessTokenService,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const presentedHash = this.refreshTokens.hash(command.refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(presentedHash);

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(session.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }
    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.BLOCKED
    ) {
      throw new AccountNotActiveError();
    }

    const access = await this.accessTokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refresh = this.refreshTokens.issue();
    await this.sessions.rotate(
      session.id,
      refresh.tokenHash,
      refresh.expiresAt,
    );

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresInSeconds,
    };
  }
}

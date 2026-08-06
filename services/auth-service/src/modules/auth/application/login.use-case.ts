import { Inject, Injectable } from '@nestjs/common';
import {
  AccountNotActiveError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '../domain/errors/domain.error';
import { ACCESS_TOKEN_SERVICE } from '../domain/ports/access-token.service.port';
import type { AccessTokenService } from '../domain/ports/access-token.service.port';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../domain/ports/password-hasher.port';
import { REFRESH_TOKEN_SERVICE } from '../domain/ports/refresh-token-service.port';
import type { RefreshTokenService } from '../domain/ports/refresh-token-service.port';
import { SESSION_REPOSITORY } from '../domain/ports/session-repository.port';
import type { SessionRepository } from '../domain/ports/session-repository.port';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';
import type { UserRepository } from '../domain/ports/user-repository.port';
import { UserStatus } from '../domain/user';

export interface LoginCommand {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
  deviceType?: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/**
 * Authenticates a user and opens a session.
 *
 * Order is security-critical: password is checked BEFORE account-state/verified
 * checks, so those states are never revealed to a caller who can't authenticate.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: AccessTokenService,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokens: RefreshTokenService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();

    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordValid = await this.hasher.verify(
      user.passwordHash,
      command.password,
    );
    if (!passwordValid) {
      throw new InvalidCredentialsError();
    }

    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.BLOCKED
    ) {
      throw new AccountNotActiveError();
    }
    if (!user.isEmailVerified) {
      throw new EmailNotVerifiedError();
    }

    const access = await this.accessTokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refresh = this.refreshTokens.issue();
    await this.sessions.create({
      userId: user.id,
      refreshTokenHash: refresh.tokenHash,
      deviceName: command.deviceName ?? null,
      deviceType: command.deviceType ?? null,
      ipAddress: command.ipAddress ?? null,
      userAgent: command.userAgent ?? null,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresInSeconds,
    };
  }
}

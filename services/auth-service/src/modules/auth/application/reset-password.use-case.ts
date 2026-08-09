import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_RESET_STORE } from '../domain/ports/password-reset-store.port';
import {
  InvalidResetCodeError,
  TooManyResetAttemptsError,
} from '../domain/errors/domain.error';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../domain/ports/password-hasher.port';
import type { PasswordResetCodeStore } from '../domain/ports/password-reset-store.port';
import { SESSION_REPOSITORY } from '../domain/ports/session-repository.port';
import type { SessionRepository } from '../domain/ports/session-repository.port';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';
import type { UserRepository } from '../domain/ports/user-repository.port';

const MAX_RESET_ATTEMPTS = 5;

export interface ResetPasswordCommand {
  email: string;
  otp: string;
  newPassword: string;
}

/**
 * Completes password recovery: verify the OTP (attempt-limited), set a new
 * Argon2 hash, revoke ALL sessions (a password change invalidates every login,
 * since the old credential may be compromised), and consume the OTP.
 *
 * Missing / expired / mismatched OTP is reported uniformly as invalid.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(PASSWORD_RESET_STORE)
    private readonly resetStore: PasswordResetCodeStore,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new InvalidResetCodeError();
    }

    const entry = await this.resetStore.get(user.id);
    if (!entry) {
      throw new InvalidResetCodeError();
    }
    if (entry.attempts >= MAX_RESET_ATTEMPTS) {
      throw new TooManyResetAttemptsError();
    }
    if (entry.code !== command.otp) {
      await this.resetStore.incrementAttempts(user.id);
      throw new InvalidResetCodeError();
    }

    const passwordHash = await this.hasher.hash(command.newPassword);
    await this.users.updatePassword(user.id, passwordHash);
    await this.sessions.revokeAllByUserId(user.id);
    await this.resetStore.consume(user.id);
  }
}

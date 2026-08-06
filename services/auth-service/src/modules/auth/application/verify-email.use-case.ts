import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_VERIFICATION_STORE } from '../../../infrastructure/redis/redis.tokens';
import {
  InvalidVerificationTokenError,
  TooManyVerificationAttemptsError,
} from '../domain/errors/domain.error';
import type { EmailVerificationCodeStore } from '../domain/ports/email-verification-store.port';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';
import type { UserRepository } from '../domain/ports/user-repository.port';

const MAX_VERIFICATION_ATTEMPTS = 5;

export interface VerifyEmailCommand {
  userId: string;
  token: string;
}

export interface VerifyEmailResult {
  verified: true;
}

/**
 * Verifies an email:
 *   read token (Redis) -> attempt-limit guard -> compare -> activate user
 *   (status ACTIVE, isEmailVerified true) -> consume token.
 *
 * A wrong token increments the attempt counter; a missing/expired token or a
 * mismatch is reported uniformly as invalid (no oracle on which one it was).
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(EMAIL_VERIFICATION_STORE)
    private readonly store: EmailVerificationCodeStore,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailResult> {
    const { userId, token } = command;

    const entry = await this.store.get(userId);
    if (!entry) {
      throw new InvalidVerificationTokenError();
    }
    if (entry.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new TooManyVerificationAttemptsError();
    }
    if (entry.code !== token) {
      await this.store.incrementAttempts(userId);
      throw new InvalidVerificationTokenError();
    }

    const user = await this.users.findById(userId);
    if (!user) {
      // Token existed but the user is gone (e.g. deleted) — clean up, reject.
      await this.store.consume(userId);
      throw new InvalidVerificationTokenError();
    }

    await this.users.markEmailVerified(userId);
    await this.store.consume(userId);

    return { verified: true };
  }
}

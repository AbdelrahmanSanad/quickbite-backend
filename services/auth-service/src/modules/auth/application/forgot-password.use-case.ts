import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_RESET_STORE } from '../domain/ports/password-reset-store.port';
import { PasswordResetRequestedEvent } from '../domain/events/password-reset-requested.event';
import { EVENT_PUBLISHER } from '../domain/ports/event-publisher.port';
import type { DomainEventPublisher } from '../domain/ports/event-publisher.port';
import { OTP_GENERATOR } from '../domain/ports/otp-generator.port';
import type { OtpGenerator } from '../domain/ports/otp-generator.port';
import type { PasswordResetCodeStore } from '../domain/ports/password-reset-store.port';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';
import type { UserRepository } from '../domain/ports/user-repository.port';

export interface ForgotPasswordCommand {
  email: string;
}

/**
 * Starts password recovery: generate an OTP, store it (Redis, 10m), and publish
 * PasswordResetRequested so it can be emailed.
 *
 * Always succeeds regardless of whether the email exists — never reveals which
 * addresses are registered (no user enumeration). The OTP is never returned.
 */
@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_GENERATOR) private readonly otp: OtpGenerator,
    @Inject(PASSWORD_RESET_STORE)
    private readonly resetStore: PasswordResetCodeStore,
    @Inject(EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) {
      return; // Silent no-op — do not disclose that the email is unknown.
    }

    const code = this.otp.generate();
    await this.resetStore.issue(user.id, code);

    this.events.publish(
      PasswordResetRequestedEvent.EVENT,
      new PasswordResetRequestedEvent(user.id, user.email, code),
    );
  }
}

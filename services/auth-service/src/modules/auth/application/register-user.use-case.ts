import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_VERIFICATION_STORE } from '../domain/ports/email-verification-store.port';
import { EmailAlreadyInUseError } from '../domain/errors/domain.error';
import { UserRegisteredEvent } from '../domain/events/user-registered.event';
import { EVENT_PUBLISHER } from '../domain/ports/event-publisher.port';
import type { DomainEventPublisher } from '../domain/ports/event-publisher.port';
import type { EmailVerificationCodeStore } from '../domain/ports/email-verification-store.port';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../domain/ports/password-hasher.port';
import { TOKEN_GENERATOR } from '../domain/ports/token-generator.port';
import type { TokenGenerator } from '../domain/ports/token-generator.port';
import { USER_REPOSITORY } from '../domain/ports/user-repository.port';
import type { UserRepository } from '../domain/ports/user-repository.port';
import { UserRole, UserStatus } from '../domain/user';

export interface RegisterUserCommand {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterUserResult {
  id: string;
  email: string;
  status: UserStatus;
}

/**
 * Registers a new customer:
 *   validate uniqueness -> hash password -> persist (PENDING) ->
 *   issue verification token (Redis, 24h) -> publish UserRegistered.
 *
 * Depends only on ports — no Prisma / Argon2 / Redis / HTTP knowledge here.
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_GENERATOR) private readonly tokens: TokenGenerator,
    @Inject(EMAIL_VERIFICATION_STORE)
    private readonly verificationStore: EmailVerificationCodeStore,
    @Inject(EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = command.email.trim().toLowerCase();

    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.hasher.hash(command.password);

    // Public registration always creates a CUSTOMER; role is never client-supplied.
    const user = await this.users.create({
      firstName: command.firstName.trim(),
      lastName: command.lastName.trim(),
      email,
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    const verificationToken = this.tokens.generate();
    await this.verificationStore.issue(user.id, verificationToken);

    this.events.publish(
      UserRegisteredEvent.EVENT,
      new UserRegisteredEvent(
        user.id,
        user.email,
        user.firstName,
        verificationToken,
      ),
    );

    return { id: user.id, email: user.email, status: user.status };
  }
}

/**
 * Raised when a new user has been registered (status PENDING).
 * Carries the verification token so a downstream email sender can deliver it.
 * Emitted in-process for now; the same contract maps onto a RabbitMQ message
 * when a real consumer exists.
 */
export class UserRegisteredEvent {
  static readonly EVENT = 'user.registered';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly verificationToken: string,
  ) {}
}

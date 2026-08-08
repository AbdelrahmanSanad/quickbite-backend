/**
 * Raised when a user requests a password reset. Carries the OTP so a downstream
 * email/SMS sender can deliver it. Emitted in-process for now.
 */
export class PasswordResetRequestedEvent {
  static readonly EVENT = 'password.reset.requested';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly otp: string,
  ) {}
}

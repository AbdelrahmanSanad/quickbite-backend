/** Generates short numeric one-time passcodes (e.g. password reset). */
export interface OtpGenerator {
  generate(): string;
}

export const OTP_GENERATOR = Symbol('OTP_GENERATOR');

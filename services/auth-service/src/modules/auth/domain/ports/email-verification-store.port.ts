export interface VerificationCodeEntry {
  code: string;
  attempts: number;
}

/**
 * The slice of the verification-code store the auth use-cases need.
 * The existing VerificationCodeStore (Redis) satisfies this structurally.
 */
export interface EmailVerificationCodeStore {
  issue(userId: string, code: string): Promise<void>;
  get(userId: string): Promise<VerificationCodeEntry | null>;
  incrementAttempts(userId: string): Promise<number>;
  consume(userId: string): Promise<void>;
}

/** DI token — the port lives in the domain, adapters implement it. */
export const EMAIL_VERIFICATION_STORE = Symbol('EMAIL_VERIFICATION_STORE');

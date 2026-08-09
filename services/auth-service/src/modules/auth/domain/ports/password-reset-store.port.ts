export interface PasswordResetEntry {
  code: string;
  attempts: number;
}

/**
 * The password-reset code store (Redis `password-reset:{userId}`, TTL 10m).
 * The existing VerificationCodeStore satisfies this structurally.
 */
export interface PasswordResetCodeStore {
  issue(userId: string, code: string): Promise<void>;
  get(userId: string): Promise<PasswordResetEntry | null>;
  incrementAttempts(userId: string): Promise<number>;
  consume(userId: string): Promise<void>;
}

/** DI token — the port lives in the domain, adapters implement it. */
export const PASSWORD_RESET_STORE = Symbol('PASSWORD_RESET_STORE');

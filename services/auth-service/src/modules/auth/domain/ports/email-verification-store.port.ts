/**
 * The slice of the verification-code store the register use-case needs.
 * The existing VerificationCodeStore (Redis) satisfies this structurally.
 */
export interface EmailVerificationCodeStore {
  issue(userId: string, code: string): Promise<void>;
}

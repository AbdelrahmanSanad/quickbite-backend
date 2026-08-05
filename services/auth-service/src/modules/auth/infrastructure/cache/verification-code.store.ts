import type Redis from 'ioredis';

export interface VerificationCodeStoreOptions {
  /** Redis key prefix, e.g. 'verify-email' or 'password-reset'. */
  keyPrefix: string;
  /** Hash field holding the code, e.g. 'token' or 'otp'. */
  codeField: string;
  /** Time-to-live in seconds (24h, 10m, ...). */
  ttlSeconds: number;
}

export interface VerificationCodeEntry {
  code: string;
  attempts: number;
}

/**
 * Redis-backed store for short-lived verification codes.
 *
 * Stored as a HASH per user: { <codeField>: <code>, attempts: <n> } with a TTL.
 * - Hash + HINCRBY gives ATOMIC attempt counting (no read-modify-write race).
 * - Keyed by userId => exactly one active code per user; re-issuing overwrites.
 * - TTL means expiry is automatic; no cleanup job.
 *
 * One class, configured per use case (email verification, password reset) —
 * composition over duplication.
 */
export class VerificationCodeStore {
  constructor(
    private readonly redis: Redis,
    private readonly options: VerificationCodeStoreOptions,
  ) {}

  private key(userId: string): string {
    return `${this.options.keyPrefix}:${userId}`;
  }

  /** Create or replace the code for a user, resetting attempts and TTL. */
  async issue(userId: string, code: string): Promise<void> {
    const key = this.key(userId);
    await this.redis
      .multi()
      .del(key) // clear any previous code + attempts
      .hset(key, this.options.codeField, code, 'attempts', '0')
      .expire(key, this.options.ttlSeconds)
      .exec();
  }

  /** Read the current entry, or null if none / expired. */
  async get(userId: string): Promise<VerificationCodeEntry | null> {
    const data = await this.redis.hgetall(this.key(userId));
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return {
      code: data[this.options.codeField],
      attempts: Number(data.attempts ?? 0),
    };
  }

  /** Atomically increment the attempt counter; returns the new count. */
  async incrementAttempts(userId: string): Promise<number> {
    return this.redis.hincrby(this.key(userId), 'attempts', 1);
  }

  /** Seconds remaining before expiry (-2 = no key, -1 = no TTL). */
  async ttl(userId: string): Promise<number> {
    return this.redis.ttl(this.key(userId));
  }

  /** Remove the code (e.g. after a successful verification). */
  async consume(userId: string): Promise<void> {
    await this.redis.del(this.key(userId));
  }
}

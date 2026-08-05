/**
 * DI tokens for Redis-backed providers.
 * Symbols avoid string-collision and make the wiring explicit.
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
export const EMAIL_VERIFICATION_STORE = Symbol('EMAIL_VERIFICATION_STORE');
export const PASSWORD_RESET_STORE = Symbol('PASSWORD_RESET_STORE');

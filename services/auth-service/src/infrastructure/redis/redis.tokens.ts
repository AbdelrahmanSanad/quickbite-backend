/**
 * DI token for the shared Redis connection.
 * (The verification/reset store tokens live with their ports in the domain.)
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

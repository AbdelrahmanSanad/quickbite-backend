/** Generates opaque, URL-safe random tokens (e.g. email verification). */
export interface TokenGenerator {
  generate(): string;
}

export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');

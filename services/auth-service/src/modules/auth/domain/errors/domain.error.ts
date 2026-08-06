/**
 * Base class for domain-level failures. These are transport-agnostic — the
 * presentation layer (DomainExceptionFilter) maps them to HTTP status codes,
 * so the domain never depends on HTTP.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The submitted email already belongs to an account. */
export class EmailAlreadyInUseError extends DomainError {
  constructor() {
    super('Email is already registered');
  }
}

/** Wrong email or password (kept generic to avoid user enumeration). */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password');
  }
}

/** The account exists and password is correct, but email isn't verified. */
export class EmailNotVerifiedError extends DomainError {
  constructor() {
    super('Email is not verified');
  }
}

/** The account is suspended or blocked. */
export class AccountNotActiveError extends DomainError {
  constructor() {
    super('Account is not active');
  }
}

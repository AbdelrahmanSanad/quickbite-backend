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

/** No restaurant with that id exists, or it has been soft-deleted. */
export class RestaurantNotFoundError extends DomainError {
  constructor() {
    super('Restaurant not found');
  }
}

/**
 * The authenticated owner is not the owner of the target restaurant (and is not
 * an ADMIN). Never reveals another owner's data — only that access is denied.
 */
export class ForbiddenOwnershipError extends DomainError {
  constructor() {
    super('You do not have permission to modify this restaurant');
  }
}

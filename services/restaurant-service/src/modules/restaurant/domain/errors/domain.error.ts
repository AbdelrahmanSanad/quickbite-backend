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
 * No branch with that id exists, it has been soft-deleted, or its parent
 * restaurant has been soft-deleted (a branch is invisible once its parent is).
 */
export class BranchNotFoundError extends DomainError {
  constructor() {
    super('Branch not found');
  }
}

/**
 * No category with that id exists, it has been soft-deleted, or its parent
 * restaurant has been soft-deleted (invisible once its parent is).
 */
export class CategoryNotFoundError extends DomainError {
  constructor() {
    super('Category not found');
  }
}

/**
 * A live category with the same name already exists in this restaurant. The name
 * is unique among non-deleted categories (partial-unique index); a soft-deleted
 * name is free to reuse.
 */
export class DuplicateCategoryError extends DomainError {
  constructor() {
    super('A category with this name already exists in this restaurant');
  }
}

/**
 * The authenticated owner is not the owner of the target restaurant (and is not
 * an ADMIN). Never reveals another owner's data — only that access is denied.
 */
export class ForbiddenOwnershipError extends DomainError {
  constructor() {
    super('You do not have permission to modify this resource');
  }
}

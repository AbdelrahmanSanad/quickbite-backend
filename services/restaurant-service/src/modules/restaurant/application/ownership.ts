import { ForbiddenOwnershipError } from '../domain/errors/domain.error';
import { Restaurant } from '../domain/restaurant';

/**
 * The authenticated identity behind a request, as needed to authorize a write.
 * `role` is a plain string (the JWT claim); the ADMIN super-role is compared by
 * value so the application layer stays free of the auth/transport libraries.
 */
export interface Actor {
  userId: string;
  role: string;
}

/** ADMIN is an administrative super-role that overrides ownership (§8). */
const ADMIN_ROLE = 'ADMIN';

/**
 * Core ownership rule: the actor must own the resource (identified by its
 * resolved `ownerId`), unless they are an ADMIN. Throws
 * {@link ForbiddenOwnershipError} (→ 403) otherwise. The `ownerId` is always
 * resolved from persisted data — never trusted from the request.
 */
export function assertActorOwns(ownerId: string, actor: Actor): void {
  if (actor.role === ADMIN_ROLE) {
    return;
  }
  if (ownerId !== actor.userId) {
    throw new ForbiddenOwnershipError();
  }
}

/** Ownership rule for a restaurant aggregate root (delegates to the core rule). */
export function assertCanManage(restaurant: Restaurant, actor: Actor): void {
  assertActorOwns(restaurant.ownerId, actor);
}

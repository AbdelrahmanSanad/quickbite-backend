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
 * Ownership rule for every restaurant write: the actor must own the restaurant,
 * unless they are an ADMIN. Throws {@link ForbiddenOwnershipError} (→ 403)
 * otherwise. Never trusts an owner id from the request — only the loaded row.
 */
export function assertCanManage(restaurant: Restaurant, actor: Actor): void {
  if (actor.role === ADMIN_ROLE) {
    return;
  }
  if (restaurant.ownerId !== actor.userId) {
    throw new ForbiddenOwnershipError();
  }
}

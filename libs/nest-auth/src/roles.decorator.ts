import { SetMetadata } from '@nestjs/common';
import { Role } from './role';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given roles (RolesGuard enforces it). ADMIN always
 * passes (super-role). A route with no @Roles has no role restriction.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

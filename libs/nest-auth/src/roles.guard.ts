import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from './authenticated-user';
import { Role } from './role';
import { ROLES_KEY } from './roles.decorator';

/**
 * Enforces `@Roles(...)`. Runs after JwtAuthGuard (which sets request.user).
 * ADMIN is a super-role and passes any role-restricted route. A route without
 * `@Roles` is unrestricted (authentication may still be required separately).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const role = request.user?.role;
    if (!role) {
      throw new ForbiddenException('Missing authenticated role');
    }
    if (role === Role.ADMIN || required.includes(role as Role)) {
      return true;
    }
    throw new ForbiddenException('Insufficient role');
  }
}

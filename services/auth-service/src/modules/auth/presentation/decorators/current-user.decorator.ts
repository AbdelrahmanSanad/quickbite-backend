import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../security/authenticated-user';

/**
 * Injects the authenticated user set by JwtAuthGuard, so controllers don't
 * depend on `@Req()`. Only meaningful on routes protected by JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    return request.user;
  },
);

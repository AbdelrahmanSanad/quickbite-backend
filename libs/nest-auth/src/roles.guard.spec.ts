import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role';
import { RolesGuard } from './roles.guard';

function ctxWith(user?: { role: string }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const withRequired = (roles: Role[] | undefined) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(roles),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  };

  it('allows when no @Roles is set (unrestricted)', () => {
    withRequired(undefined);
    expect(guard.canActivate(ctxWith({ role: 'CUSTOMER' }))).toBe(true);
  });

  it('allows a matching role', () => {
    withRequired([Role.RESTAURANT_OWNER]);
    expect(guard.canActivate(ctxWith({ role: 'RESTAURANT_OWNER' }))).toBe(true);
  });

  it('allows ADMIN (super-role) even when not explicitly listed', () => {
    withRequired([Role.RESTAURANT_OWNER]);
    expect(guard.canActivate(ctxWith({ role: 'ADMIN' }))).toBe(true);
  });

  it('denies a non-matching role', () => {
    withRequired([Role.RESTAURANT_OWNER]);
    expect(() => guard.canActivate(ctxWith({ role: 'CUSTOMER' }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when no authenticated role is present', () => {
    withRequired([Role.RESTAURANT_OWNER]);
    expect(() => guard.canActivate(ctxWith(undefined))).toThrow(
      ForbiddenException,
    );
  });
});

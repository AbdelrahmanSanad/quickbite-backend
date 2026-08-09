import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const TEST_SECRET = 'unit-test-secret-0123456789';

function contextWith(authorization?: string) {
  const req: any = { headers: {} };
  if (authorization !== undefined) {
    req.headers.authorization = authorization;
  }
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard', () => {
  let jwt: JwtService;
  let guard: JwtAuthGuard;
  const config = { getOrThrow: jest.fn().mockReturnValue(TEST_SECRET) } as any;

  const sign = (opts: { secret?: string; expiresIn?: string | number } = {}) =>
    jwt.signAsync(
      { sub: 'u1', email: 'ada@example.com', role: 'CUSTOMER' },
      { secret: opts.secret ?? TEST_SECRET, expiresIn: opts.expiresIn ?? 900 },
    );

  beforeEach(() => {
    jwt = new JwtService({});
    guard = new JwtAuthGuard(jwt, config);
  });

  it('accepts a valid token and populates request.user from the payload', async () => {
    const token = await sign();
    const { ctx, req } = contextWith(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      userId: 'u1',
      email: 'ada@example.com',
      role: 'CUSTOMER',
    });
  });

  it('rejects a missing Authorization header', async () => {
    const { ctx } = contextWith();
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a non-Bearer scheme', async () => {
    const { ctx } = contextWith('Basic abc123');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a Bearer header with no token', async () => {
    const { ctx } = contextWith('Bearer');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a malformed Authorization header (extra parts)', async () => {
    const { ctx } = contextWith('Bearer a b');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a malformed JWT', async () => {
    const { ctx } = contextWith('Bearer not-a-jwt');
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const token = await sign({ expiresIn: -10 });
    const { ctx } = contextWith(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = await sign({ secret: 'a-different-secret-0123456789' });
    const { ctx } = contextWith(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

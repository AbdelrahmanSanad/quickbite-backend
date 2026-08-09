import {
  AccountNotActiveError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '../domain/errors/domain.error';
import { User, UserRole, UserStatus } from '../domain/user';
import { LoginUseCase } from './login.use-case';

const makeUser = (over: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  passwordHash: 'hashed-pw',
  role: UserRole.CUSTOMER,
  status: UserStatus.ACTIVE,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...over,
});

describe('LoginUseCase', () => {
  let users: any;
  let hasher: any;
  let accessTokens: any;
  let refreshTokens: any;
  let sessions: any;
  let useCase: LoginUseCase;

  const cmd = { email: 'ada@example.com', password: 'StrongP@ss1' };

  beforeEach(() => {
    users = { findByEmail: jest.fn() };
    hasher = { verify: jest.fn().mockResolvedValue(true) };
    accessTokens = {
      issue: jest
        .fn()
        .mockResolvedValue({ token: 'access', expiresInSeconds: 900 }),
    };
    refreshTokens = {
      issue: jest.fn().mockReturnValue({
        token: 'raw-refresh',
        tokenHash: 'refresh-hash',
        expiresAt: new Date(Date.now() + 1000),
      }),
    };
    sessions = { create: jest.fn() };
    useCase = new LoginUseCase(
      users,
      hasher,
      accessTokens,
      refreshTokens,
      sessions,
    );
  });

  it('returns tokens and opens a session for valid, active, verified credentials', async () => {
    users.findByEmail.mockResolvedValue(makeUser());

    const result = await useCase.execute(cmd);

    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        refreshTokenHash: 'refresh-hash',
      }),
    );
    expect(result).toEqual({
      accessToken: 'access',
      refreshToken: 'raw-refresh',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
  });

  it('rejects an unknown email with InvalidCredentials', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('rejects a wrong password with InvalidCredentials', async () => {
    users.findByEmail.mockResolvedValue(makeUser());
    hasher.verify.mockResolvedValue(false);
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rejects a suspended account (after a correct password) with AccountNotActive', async () => {
    users.findByEmail.mockResolvedValue(
      makeUser({ status: UserStatus.SUSPENDED }),
    );
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      AccountNotActiveError,
    );
  });

  it('rejects an unverified email with EmailNotVerified', async () => {
    users.findByEmail.mockResolvedValue(
      makeUser({ status: UserStatus.PENDING, isEmailVerified: false }),
    );
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      EmailNotVerifiedError,
    );
  });
});

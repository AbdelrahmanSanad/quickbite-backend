import { InvalidRefreshTokenError } from '../domain/errors/domain.error';
import { RefreshTokenUseCase } from './refresh-token.use-case';

const activeSession = () => ({
  id: 's1',
  userId: 'u1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60_000),
});

describe('RefreshTokenUseCase', () => {
  let sessions: any;
  let users: any;
  let accessTokens: any;
  let refreshTokens: any;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    sessions = { findByRefreshTokenHash: jest.fn(), rotate: jest.fn() };
    users = {
      findById: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@b.co',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      }),
    };
    accessTokens = {
      issue: jest
        .fn()
        .mockResolvedValue({ token: 'new-access', expiresInSeconds: 900 }),
    };
    refreshTokens = {
      hash: jest.fn().mockReturnValue('presented-hash'),
      issue: jest.fn().mockReturnValue({
        token: 'new-refresh',
        tokenHash: 'new-hash',
        expiresAt: new Date(Date.now() + 1000),
      }),
    };
    useCase = new RefreshTokenUseCase(
      sessions,
      users,
      accessTokens,
      refreshTokens,
    );
  });

  it('rotates the session and returns new tokens', async () => {
    sessions.findByRefreshTokenHash.mockResolvedValue(activeSession());

    const result = await useCase.execute({ refreshToken: 'raw' });

    expect(refreshTokens.hash).toHaveBeenCalledWith('raw');
    expect(sessions.rotate).toHaveBeenCalledWith(
      's1',
      'new-hash',
      expect.any(Date),
    );
    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
  });

  it('rejects an unknown token', async () => {
    sessions.findByRefreshTokenHash.mockResolvedValue(null);
    await expect(
      useCase.execute({ refreshToken: 'raw' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('rejects a revoked session', async () => {
    sessions.findByRefreshTokenHash.mockResolvedValue({
      ...activeSession(),
      revokedAt: new Date(),
    });
    await expect(
      useCase.execute({ refreshToken: 'raw' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('rejects an expired session', async () => {
    sessions.findByRefreshTokenHash.mockResolvedValue({
      ...activeSession(),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      useCase.execute({ refreshToken: 'raw' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });
});

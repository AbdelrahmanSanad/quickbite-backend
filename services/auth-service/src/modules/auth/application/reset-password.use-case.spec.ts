import {
  InvalidResetCodeError,
  TooManyResetAttemptsError,
} from '../domain/errors/domain.error';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let users: any;
  let hasher: any;
  let resetStore: any;
  let sessions: any;
  let useCase: ResetPasswordUseCase;

  const cmd = {
    email: 'ada@example.com',
    otp: '123456',
    newPassword: 'NewStrongP@ss1',
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue({ id: 'u1' }),
      updatePassword: jest.fn(),
    };
    hasher = { hash: jest.fn().mockResolvedValue('new-hash') };
    resetStore = {
      get: jest.fn(),
      incrementAttempts: jest.fn(),
      consume: jest.fn(),
    };
    sessions = { revokeAllByUserId: jest.fn() };
    useCase = new ResetPasswordUseCase(users, hasher, resetStore, sessions);
  });

  it('updates the password, revokes all sessions, and consumes the OTP', async () => {
    resetStore.get.mockResolvedValue({ code: '123456', attempts: 0 });

    await useCase.execute(cmd);

    expect(hasher.hash).toHaveBeenCalledWith('NewStrongP@ss1');
    expect(users.updatePassword).toHaveBeenCalledWith('u1', 'new-hash');
    expect(sessions.revokeAllByUserId).toHaveBeenCalledWith('u1');
    expect(resetStore.consume).toHaveBeenCalledWith('u1');
  });

  it('rejects an unknown email as an invalid code (no enumeration)', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      InvalidResetCodeError,
    );
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it('rejects when no OTP is stored', async () => {
    resetStore.get.mockResolvedValue(null);
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      InvalidResetCodeError,
    );
  });

  it('rejects after too many attempts', async () => {
    resetStore.get.mockResolvedValue({ code: '123456', attempts: 5 });
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      TooManyResetAttemptsError,
    );
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it('increments attempts and rejects a wrong OTP', async () => {
    resetStore.get.mockResolvedValue({ code: '999999', attempts: 1 });
    await expect(useCase.execute(cmd)).rejects.toBeInstanceOf(
      InvalidResetCodeError,
    );
    expect(resetStore.incrementAttempts).toHaveBeenCalledWith('u1');
    expect(users.updatePassword).not.toHaveBeenCalled();
  });
});

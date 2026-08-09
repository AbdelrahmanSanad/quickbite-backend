import {
  InvalidVerificationTokenError,
  TooManyVerificationAttemptsError,
} from '../domain/errors/domain.error';
import { VerifyEmailUseCase } from './verify-email.use-case';

describe('VerifyEmailUseCase', () => {
  let users: any;
  let store: any;
  let useCase: VerifyEmailUseCase;

  beforeEach(() => {
    users = { findById: jest.fn(), markEmailVerified: jest.fn() };
    store = {
      get: jest.fn(),
      incrementAttempts: jest.fn(),
      consume: jest.fn(),
    };
    useCase = new VerifyEmailUseCase(users, store);
  });

  it('activates the user and consumes the token on a correct code', async () => {
    store.get.mockResolvedValue({ code: 'tok', attempts: 0 });
    users.findById.mockResolvedValue({ id: 'u1' });

    const result = await useCase.execute({ userId: 'u1', token: 'tok' });

    expect(users.markEmailVerified).toHaveBeenCalledWith('u1');
    expect(store.consume).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ verified: true });
  });

  it('rejects when no code is stored', async () => {
    store.get.mockResolvedValue(null);
    await expect(
      useCase.execute({ userId: 'u1', token: 'tok' }),
    ).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect(users.markEmailVerified).not.toHaveBeenCalled();
  });

  it('rejects after too many attempts', async () => {
    store.get.mockResolvedValue({ code: 'tok', attempts: 5 });
    await expect(
      useCase.execute({ userId: 'u1', token: 'tok' }),
    ).rejects.toBeInstanceOf(TooManyVerificationAttemptsError);
  });

  it('increments attempts and rejects on a wrong code', async () => {
    store.get.mockResolvedValue({ code: 'right', attempts: 1 });
    await expect(
      useCase.execute({ userId: 'u1', token: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidVerificationTokenError);
    expect(store.incrementAttempts).toHaveBeenCalledWith('u1');
    expect(users.markEmailVerified).not.toHaveBeenCalled();
  });
});

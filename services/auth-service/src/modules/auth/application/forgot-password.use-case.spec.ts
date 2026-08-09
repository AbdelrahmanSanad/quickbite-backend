import { ForgotPasswordUseCase } from './forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let users: any;
  let otp: any;
  let resetStore: any;
  let events: any;
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    users = { findByEmail: jest.fn() };
    otp = { generate: jest.fn().mockReturnValue('123456') };
    resetStore = { issue: jest.fn().mockResolvedValue(undefined) };
    events = { publish: jest.fn() };
    useCase = new ForgotPasswordUseCase(users, otp, resetStore, events);
  });

  it('issues an OTP and publishes the event for an existing user', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1', email: 'ada@example.com' });

    await useCase.execute({ email: '  Ada@Example.com ' });

    expect(users.findByEmail).toHaveBeenCalledWith('ada@example.com');
    expect(resetStore.issue).toHaveBeenCalledWith('u1', '123456');
    expect(events.publish).toHaveBeenCalledTimes(1);
  });

  it('is a silent no-op for an unknown email (no enumeration)', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'nobody@example.com' }),
    ).resolves.toBeUndefined();

    expect(resetStore.issue).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});

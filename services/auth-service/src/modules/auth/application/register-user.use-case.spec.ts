import { EmailAlreadyInUseError } from '../domain/errors/domain.error';
import { User, UserRole, UserStatus } from '../domain/user';
import { RegisterUserUseCase } from './register-user.use-case';

const makeUser = (over: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  passwordHash: 'hashed-pw',
  role: UserRole.CUSTOMER,
  status: UserStatus.PENDING,
  isEmailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...over,
});

describe('RegisterUserUseCase', () => {
  let users: any;
  let hasher: any;
  let tokens: any;
  let store: any;
  let events: any;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = { existsByEmail: jest.fn(), create: jest.fn() };
    hasher = { hash: jest.fn().mockResolvedValue('hashed-pw') };
    tokens = { generate: jest.fn().mockReturnValue('verif-token') };
    store = { issue: jest.fn().mockResolvedValue(undefined) };
    events = { publish: jest.fn() };
    useCase = new RegisterUserUseCase(users, hasher, tokens, store, events);
  });

  it('normalizes email, hashes password, forces CUSTOMER, issues token, publishes event', async () => {
    users.existsByEmail.mockResolvedValue(false);
    users.create.mockResolvedValue(makeUser());

    const result = await useCase.execute({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: '  Ada@Example.com ',
      password: 'StrongP@ss1',
    });

    expect(users.existsByEmail).toHaveBeenCalledWith('ada@example.com');
    expect(hasher.hash).toHaveBeenCalledWith('StrongP@ss1');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        passwordHash: 'hashed-pw',
        role: UserRole.CUSTOMER,
      }),
    );
    expect(store.issue).toHaveBeenCalledWith('u1', 'verif-token');
    expect(events.publish).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'u1',
      email: 'ada@example.com',
      status: UserStatus.PENDING,
    });
  });

  it('rejects a duplicate email and does not create', async () => {
    users.existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute({
        firstName: 'A',
        lastName: 'B',
        email: 'ada@example.com',
        password: 'StrongP@ss1',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);

    expect(users.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});

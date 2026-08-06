import { User, UserRole } from '../user';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

/** Persistence boundary for users. Implemented by the infrastructure layer. */
export interface UserRepository {
  existsByEmail(email: string): Promise<boolean>;
  create(data: CreateUserData): Promise<User>;
  findById(userId: string): Promise<User | null>;
  /** Set status = ACTIVE and isEmailVerified = true. */
  markEmailVerified(userId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

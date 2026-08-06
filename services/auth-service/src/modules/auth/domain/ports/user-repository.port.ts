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
  findByEmail(email: string): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

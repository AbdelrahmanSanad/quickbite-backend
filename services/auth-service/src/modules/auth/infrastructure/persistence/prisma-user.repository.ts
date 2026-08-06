import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  CreateUserData,
  UserRepository,
} from '../../domain/ports/user-repository.port';
import { User, UserStatus } from '../../domain/user';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByEmail(email: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return found !== null;
  }

  async create(data: CreateUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        // status defaults to PENDING, isEmailVerified to false (schema).
      },
    });
    return this.toDomain(created);
  }

  async findById(userId: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { id: userId } });
    return found ? this.toDomain(found) : null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE, isEmailVerified: true },
    });
  }

  private toDomain(u: PrismaUser): User {
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      status: u.status,
      isEmailVerified: u.isEmailVerified,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      deletedAt: u.deletedAt,
    };
  }
}

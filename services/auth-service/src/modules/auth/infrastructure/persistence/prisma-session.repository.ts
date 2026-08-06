import { Injectable } from '@nestjs/common';
import { Session as PrismaSession } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import {
  CreateSessionData,
  SessionRepository,
} from '../../domain/ports/session-repository.port';
import { Session } from '../../domain/session';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<Session> {
    const created = await this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        deviceName: data.deviceName ?? null,
        deviceType: data.deviceType ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        expiresAt: data.expiresAt,
      },
    });
    return this.toDomain(created);
  }

  private toDomain(s: PrismaSession): Session {
    return {
      id: s.id,
      userId: s.userId,
      refreshTokenHash: s.refreshTokenHash,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      lastUsedAt: s.lastUsedAt,
      revokedAt: s.revokedAt,
      createdAt: s.createdAt,
    };
  }
}

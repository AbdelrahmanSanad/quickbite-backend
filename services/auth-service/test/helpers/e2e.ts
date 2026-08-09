import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type Redis from 'ioredis';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { REDIS_CLIENT } from '../../src/infrastructure/redis/redis.tokens';
import { DomainExceptionFilter } from '../../src/modules/auth/presentation/filters/domain-exception.filter';

export const STRONG_PW = 'StrongP@ss1';

/**
 * Boots the real app for e2e. Rate limiting is disabled via the throttler's
 * `skipIf` (NODE_ENV=test) in AppModule, so no per-IP 429 flakes here.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.init();
  return app;
}

export function getRedis(app: INestApplication): Redis {
  return app.get<Redis>(REDIS_CLIENT);
}

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Registers, verifies (via the Redis token), and logs a fresh user in. */
export async function registerVerifyLogin(
  app: INestApplication,
  redis: Redis,
  email = uniqueEmail(),
): Promise<{
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}> {
  const server = app.getHttpServer();

  const reg = await request(server)
    .post('/auth/register')
    .send({ firstName: 'Test', lastName: 'User', email, password: STRONG_PW })
    .expect(201);
  const userId: string = reg.body.id;

  const token = await redis.hget(`verify-email:${userId}`, 'token');
  await request(server)
    .post('/auth/verify-email')
    .send({ userId, token })
    .expect(200);

  const login = await request(server)
    .post('/auth/login')
    .send({ email, password: STRONG_PW })
    .expect(200);

  return {
    email,
    userId,
    accessToken: login.body.accessToken,
    refreshToken: login.body.refreshToken,
  };
}

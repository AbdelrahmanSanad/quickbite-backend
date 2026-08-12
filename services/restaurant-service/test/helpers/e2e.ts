import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { DomainExceptionFilter } from '../../src/modules/restaurant/presentation/filters/domain-exception.filter';

/**
 * Boots the real app for e2e with the same global pipe + domain-error filter as
 * production (main.ts). Requires a running Postgres with `restaurant_db`
 * migrated (see the service .env). CI wiring is deferred to Task 12.
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

/**
 * Mints a real HS256 access token with the shared JWT_ACCESS_SECRET — the exact
 * token the Auth Service would issue (`{ sub, email, role }`). The Restaurant
 * Service validates it locally, so no Auth Service call is needed.
 */
export async function mintToken(
  app: INestApplication,
  opts: { userId?: string; email?: string; role: string },
): Promise<{ token: string; userId: string }> {
  const config = app.get(ConfigService);
  const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
  const jwt = new JwtService();
  const userId = opts.userId ?? randomUUID();
  const token = await jwt.signAsync(
    {
      sub: userId,
      email: opts.email ?? `${userId}@example.com`,
      role: opts.role,
    },
    { secret, expiresIn: '15m' },
  );
  return { token, userId };
}

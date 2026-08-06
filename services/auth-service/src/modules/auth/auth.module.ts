import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type Redis from 'ioredis';
import {
  EMAIL_VERIFICATION_STORE,
  PASSWORD_RESET_STORE,
  REDIS_CLIENT,
} from '../../infrastructure/redis/redis.tokens';
import { LoginUseCase } from './application/login.use-case';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { ACCESS_TOKEN_SERVICE } from './domain/ports/access-token.service.port';
import { EVENT_PUBLISHER } from './domain/ports/event-publisher.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { REFRESH_TOKEN_SERVICE } from './domain/ports/refresh-token-service.port';
import { SESSION_REPOSITORY } from './domain/ports/session-repository.port';
import { TOKEN_GENERATOR } from './domain/ports/token-generator.port';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';
import { VerificationCodeStore } from './infrastructure/cache/verification-code.store';
import { EventEmitterPublisher } from './infrastructure/events/event-emitter.publisher';
import { PrismaSessionRepository } from './infrastructure/persistence/prisma-session.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { CryptoTokenGenerator } from './infrastructure/security/crypto-token-generator';
import { JwtAccessTokenService } from './infrastructure/security/jwt-access-token.service';
import { Sha256RefreshTokenService } from './infrastructure/security/sha256-refresh-token.service';
import { AuthController } from './presentation/auth.controller';

const ONE_DAY_SECONDS = 60 * 60 * 24;
const TEN_MINUTES_SECONDS = 60 * 10;

/**
 * Auth feature module. Binds domain ports to infrastructure adapters and
 * exposes the register + login endpoints. Use-cases depend on tokens.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,

    // Port -> adapter bindings
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: CryptoTokenGenerator },
    { provide: EVENT_PUBLISHER, useClass: EventEmitterPublisher },
    { provide: ACCESS_TOKEN_SERVICE, useClass: JwtAccessTokenService },
    { provide: REFRESH_TOKEN_SERVICE, useClass: Sha256RefreshTokenService },

    // verify-email:{userId} -> { token, attempts }  TTL 24h
    {
      provide: EMAIL_VERIFICATION_STORE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) =>
        new VerificationCodeStore(redis, {
          keyPrefix: 'verify-email',
          codeField: 'token',
          ttlSeconds: ONE_DAY_SECONDS,
        }),
    },
    // password-reset:{userId} -> { otp, attempts }  TTL 10m
    {
      provide: PASSWORD_RESET_STORE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) =>
        new VerificationCodeStore(redis, {
          keyPrefix: 'password-reset',
          codeField: 'otp',
          ttlSeconds: TEN_MINUTES_SECONDS,
        }),
    },
  ],
  exports: [EMAIL_VERIFICATION_STORE, PASSWORD_RESET_STORE],
})
export class AuthModule {}

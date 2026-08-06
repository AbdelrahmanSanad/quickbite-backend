import { Module } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  EMAIL_VERIFICATION_STORE,
  PASSWORD_RESET_STORE,
  REDIS_CLIENT,
} from '../../infrastructure/redis/redis.tokens';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { VerifyEmailUseCase } from './application/verify-email.use-case';
import { EVENT_PUBLISHER } from './domain/ports/event-publisher.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { TOKEN_GENERATOR } from './domain/ports/token-generator.port';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';
import { VerificationCodeStore } from './infrastructure/cache/verification-code.store';
import { EventEmitterPublisher } from './infrastructure/events/event-emitter.publisher';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { CryptoTokenGenerator } from './infrastructure/security/crypto-token-generator';
import { AuthController } from './presentation/auth.controller';

const ONE_DAY_SECONDS = 60 * 60 * 24;
const TEN_MINUTES_SECONDS = 60 * 10;

/**
 * Auth feature module. Binds domain ports to infrastructure adapters and
 * exposes the register endpoint. Use-cases depend on tokens, never concretes.
 */
@Module({
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    VerifyEmailUseCase,

    // Port -> adapter bindings
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_GENERATOR, useClass: CryptoTokenGenerator },
    { provide: EVENT_PUBLISHER, useClass: EventEmitterPublisher },

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

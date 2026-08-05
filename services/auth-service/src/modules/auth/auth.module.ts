import { Module } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  EMAIL_VERIFICATION_STORE,
  PASSWORD_RESET_STORE,
  REDIS_CLIENT,
} from '../../infrastructure/redis/redis.tokens';
import { VerificationCodeStore } from './infrastructure/cache/verification-code.store';

const ONE_DAY_SECONDS = 60 * 60 * 24;
const TEN_MINUTES_SECONDS = 60 * 10;

/**
 * Auth feature module.
 * For now it provides the two Redis-backed code stores; the register /
 * verify-email / password-reset use cases will be added on top of these.
 */
@Module({
  providers: [
    {
      // verify-email:{userId} -> { token, attempts }  TTL 24h
      provide: EMAIL_VERIFICATION_STORE,
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) =>
        new VerificationCodeStore(redis, {
          keyPrefix: 'verify-email',
          codeField: 'token',
          ttlSeconds: ONE_DAY_SECONDS,
        }),
    },
    {
      // password-reset:{userId} -> { otp, attempts }  TTL 10m
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

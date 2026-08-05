import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.tokens';

/**
 * Provides a single shared ioredis connection, app-wide.
 * Global so any feature module can inject REDIS_CLIENT without re-importing.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const url = config.getOrThrow<string>('REDIS_URL');
        return new Redis(url, {
          // Fail fast on a wrong command rather than retrying forever.
          maxRetriesPerRequest: 3,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Close the connection cleanly on shutdown (needs enableShutdownHooks). */
  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}

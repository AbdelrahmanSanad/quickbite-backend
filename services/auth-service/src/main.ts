import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './modules/auth/presentation/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Secure HTTP headers.
  app.use(helmet());

  // CORS: only the configured origins (empty list => no cross-origin allowed).
  const origins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  });

  // Reject unknown/invalid fields and transform payloads into DTO instances.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Map domain errors -> HTTP responses.
  app.useGlobalFilters(new DomainExceptionFilter());

  // Lets OnApplicationShutdown fire (Redis/Prisma connections close cleanly).
  app.enableShutdownHooks();

  await app.listen(config.get<number>('PORT') ?? 3000);
}
void bootstrap();

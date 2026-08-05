import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './modules/auth/presentation/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

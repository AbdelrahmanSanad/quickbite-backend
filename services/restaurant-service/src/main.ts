import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './modules/restaurant/presentation/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Reject unknown/invalid fields and transform payloads into DTO instances.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Map domain errors -> HTTP responses (keeps domain/application HTTP-free).
  app.useGlobalFilters(new DomainExceptionFilter());

  // Lets OnApplicationShutdown fire (DB/Redis connections close cleanly).
  app.enableShutdownHooks();

  await app.listen(Number(config.getOrThrow('PORT')));
}
void bootstrap();

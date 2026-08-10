import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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

  // Lets OnApplicationShutdown fire (DB/Redis connections close cleanly later).
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();

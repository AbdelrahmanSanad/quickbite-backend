import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestAuthModule } from '@quickbite/nest-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ProbeController } from './probe/probe.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    PrismaModule,
    NestAuthModule,
  ],
  controllers: [AppController, ProbeController],
  providers: [AppService],
})
export class AppModule {}

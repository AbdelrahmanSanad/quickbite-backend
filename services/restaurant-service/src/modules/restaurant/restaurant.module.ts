import { Module } from '@nestjs/common';
import { NestAuthModule } from '@quickbite/nest-auth';
import { CreateRestaurantUseCase } from './application/create-restaurant.use-case';
import { GetRestaurantUseCase } from './application/get-restaurant.use-case';
import { SoftDeleteRestaurantUseCase } from './application/soft-delete-restaurant.use-case';
import { UpdateRestaurantUseCase } from './application/update-restaurant.use-case';
import { RESTAURANT_REPOSITORY } from './domain/ports/restaurant-repository.port';
import { PrismaRestaurantRepository } from './infrastructure/persistence/prisma-restaurant.repository';
import { RestaurantController } from './presentation/restaurant.controller';

/**
 * Restaurant feature module. Binds the repository port to its Prisma adapter and
 * wires the CRUD use-cases. NestAuthModule supplies the JWT/roles guards (and
 * the JwtService they depend on); PrismaService is global.
 */
@Module({
  imports: [NestAuthModule],
  controllers: [RestaurantController],
  providers: [
    CreateRestaurantUseCase,
    GetRestaurantUseCase,
    UpdateRestaurantUseCase,
    SoftDeleteRestaurantUseCase,
    { provide: RESTAURANT_REPOSITORY, useClass: PrismaRestaurantRepository },
  ],
})
export class RestaurantModule {}

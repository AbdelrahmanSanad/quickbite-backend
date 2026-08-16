import { Module } from '@nestjs/common';
import { NestAuthModule } from '@quickbite/nest-auth';
import { CreateBranchUseCase } from './application/create-branch.use-case';
import { CreateRestaurantUseCase } from './application/create-restaurant.use-case';
import { GetBranchUseCase } from './application/get-branch.use-case';
import { GetRestaurantUseCase } from './application/get-restaurant.use-case';
import { ListBranchesUseCase } from './application/list-branches.use-case';
import { SoftDeleteBranchUseCase } from './application/soft-delete-branch.use-case';
import { SoftDeleteRestaurantUseCase } from './application/soft-delete-restaurant.use-case';
import { UpdateBranchUseCase } from './application/update-branch.use-case';
import { UpdateRestaurantUseCase } from './application/update-restaurant.use-case';
import { BRANCH_REPOSITORY } from './domain/ports/branch-repository.port';
import { RESTAURANT_REPOSITORY } from './domain/ports/restaurant-repository.port';
import { PrismaBranchRepository } from './infrastructure/persistence/prisma-branch.repository';
import { PrismaRestaurantRepository } from './infrastructure/persistence/prisma-restaurant.repository';
import { BranchController } from './presentation/branch.controller';
import { RestaurantBranchesController } from './presentation/restaurant-branches.controller';
import { RestaurantController } from './presentation/restaurant.controller';

/**
 * Restaurant feature module. Binds the restaurant + branch repository ports to
 * their Prisma adapters and wires the CRUD use-cases. NestAuthModule supplies
 * the JWT/roles guards (and the JwtService they depend on); PrismaService is
 * global. Branches live here (part of the Restaurant aggregate) rather than in a
 * separate module — they reuse the ownership rule, filter, and restaurant repo.
 */
@Module({
  imports: [NestAuthModule],
  controllers: [
    RestaurantController,
    RestaurantBranchesController,
    BranchController,
  ],
  providers: [
    CreateRestaurantUseCase,
    GetRestaurantUseCase,
    UpdateRestaurantUseCase,
    SoftDeleteRestaurantUseCase,
    CreateBranchUseCase,
    GetBranchUseCase,
    ListBranchesUseCase,
    UpdateBranchUseCase,
    SoftDeleteBranchUseCase,
    { provide: RESTAURANT_REPOSITORY, useClass: PrismaRestaurantRepository },
    { provide: BRANCH_REPOSITORY, useClass: PrismaBranchRepository },
  ],
})
export class RestaurantModule {}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@quickbite/nest-auth';
import type { AuthenticatedUser } from '@quickbite/nest-auth';
import { CreateRestaurantUseCase } from '../application/create-restaurant.use-case';
import { GetRestaurantUseCase } from '../application/get-restaurant.use-case';
import { SoftDeleteRestaurantUseCase } from '../application/soft-delete-restaurant.use-case';
import { UpdateRestaurantUseCase } from '../application/update-restaurant.use-case';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import {
  RestaurantResponse,
  toRestaurantResponse,
} from './restaurant.response';

/**
 * Restaurant profile CRUD. Writes require a valid JWT + RESTAURANT_OWNER (ADMIN
 * passes via the super-role) + ownership (enforced in the use-case). Reads are
 * public. `ownerId` is always taken from the token, never the body.
 */
@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly createRestaurant: CreateRestaurantUseCase,
    private readonly getRestaurant: GetRestaurantUseCase,
    private readonly updateRestaurant: UpdateRestaurantUseCase,
    private readonly softDeleteRestaurant: SoftDeleteRestaurantUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRestaurantDto,
  ): Promise<RestaurantResponse> {
    const restaurant = await this.createRestaurant.execute({
      ownerId: user.userId,
      name: dto.name,
      description: dto.description,
      phone: dto.phone,
      email: dto.email,
    });
    return toRestaurantResponse(restaurant);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RestaurantResponse> {
    const restaurant = await this.getRestaurant.execute(id);
    return toRestaurantResponse(restaurant);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<RestaurantResponse> {
    const restaurant = await this.updateRestaurant.execute({
      id,
      actor: { userId: user.userId, role: user.role },
      data: {
        name: dto.name,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
      },
    });
    return toRestaurantResponse(restaurant);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.softDeleteRestaurant.execute({
      id,
      actor: { userId: user.userId, role: user.role },
    });
  }
}

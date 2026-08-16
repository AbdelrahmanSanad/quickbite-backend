import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryResponse, toCategoryResponse } from './category.response';

/**
 * Category routes nested under a restaurant: create (owner) and list (public).
 * Ownership for create is resolved from the parent restaurant, never the request.
 */
@Controller('restaurants/:restaurantId/categories')
export class RestaurantCategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    const category = await this.createCategory.execute({
      restaurantId,
      actor: { userId: user.userId, role: user.role },
      name: dto.name,
      sortOrder: dto.sortOrder,
    });
    return toCategoryResponse(category);
  }

  @Get()
  async list(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ): Promise<CategoryResponse[]> {
    const categories = await this.listCategories.execute(restaurantId);
    return categories.map(toCategoryResponse);
  }
}

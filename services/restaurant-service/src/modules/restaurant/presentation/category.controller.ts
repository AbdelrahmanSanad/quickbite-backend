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
import { GetCategoryUseCase } from '../application/get-category.use-case';
import { SoftDeleteCategoryUseCase } from '../application/soft-delete-category.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponse, toCategoryResponse } from './category.response';

/**
 * Flat category routes addressed by category id: get (public), update + delete
 * (owner|admin — ownership resolves up to the parent restaurant).
 */
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly getCategory: GetCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly softDeleteCategory: SoftDeleteCategoryUseCase,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponse> {
    const category = await this.getCategory.execute(id);
    return toCategoryResponse(category);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    const category = await this.updateCategory.execute({
      id,
      actor: { userId: user.userId, role: user.role },
      data: { name: dto.name, sortOrder: dto.sortOrder },
    });
    return toCategoryResponse(category);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.softDeleteCategory.execute({
      id,
      actor: { userId: user.userId, role: user.role },
    });
  }
}

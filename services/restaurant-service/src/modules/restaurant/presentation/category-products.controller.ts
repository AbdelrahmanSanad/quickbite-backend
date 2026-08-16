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
import { CreateProductUseCase } from '../application/create-product.use-case';
import { ListProductsUseCase } from '../application/list-products.use-case';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponse, toProductResponse } from './product.response';

/**
 * Product routes nested under a category: create (owner) and list (public).
 * Ownership for create is resolved from the category → restaurant, never the
 * request.
 */
@Controller('categories/:categoryId/products')
export class CategoryProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponse> {
    const product = await this.createProduct.execute({
      categoryId,
      actor: { userId: user.userId, role: user.role },
      name: dto.name,
      description: dto.description,
      price: dto.price,
      isAvailable: dto.isAvailable,
      sortOrder: dto.sortOrder,
    });
    return toProductResponse(product);
  }

  @Get()
  async list(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<ProductResponse[]> {
    const products = await this.listProducts.execute(categoryId);
    return products.map(toProductResponse);
  }
}

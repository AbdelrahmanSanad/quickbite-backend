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
import { GetProductUseCase } from '../application/get-product.use-case';
import { SoftDeleteProductUseCase } from '../application/soft-delete-product.use-case';
import { UpdateProductUseCase } from '../application/update-product.use-case';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, toProductResponse } from './product.response';

/**
 * Flat product routes addressed by product id: get (public), update + delete
 * (owner|admin — ownership resolves up product → category → restaurant).
 */
@Controller('products')
export class ProductController {
  constructor(
    private readonly getProduct: GetProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly softDeleteProduct: SoftDeleteProductUseCase,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponse> {
    const product = await this.getProduct.execute(id);
    return toProductResponse(product);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const product = await this.updateProduct.execute({
      id,
      actor: { userId: user.userId, role: user.role },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isAvailable: dto.isAvailable,
        sortOrder: dto.sortOrder,
      },
    });
    return toProductResponse(product);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.softDeleteProduct.execute({
      id,
      actor: { userId: user.userId, role: user.role },
    });
  }
}

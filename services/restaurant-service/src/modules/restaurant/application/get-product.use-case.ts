import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../domain/errors/domain.error';
import { Product } from '../domain/product';
import { PRODUCT_REPOSITORY } from '../domain/ports/product-repository.port';
import type { ProductRepository } from '../domain/ports/product-repository.port';

/**
 * Reads a single product. Public. Invisible (→ 404) when the product, its
 * category, or the category's restaurant is soft-deleted (the repository filters
 * up the full chain).
 */
@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(id: string): Promise<Product> {
    const found = await this.products.findByIdWithOwner(id);
    if (!found) {
      throw new ProductNotFoundError();
    }
    return found.product;
  }
}

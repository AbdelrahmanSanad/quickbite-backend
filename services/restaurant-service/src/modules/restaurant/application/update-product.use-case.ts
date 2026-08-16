import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../domain/errors/domain.error';
import { Product } from '../domain/product';
import { PRODUCT_REPOSITORY } from '../domain/ports/product-repository.port';
import type {
  ProductRepository,
  UpdateProductData,
} from '../domain/ports/product-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface UpdateProductCommand {
  id: string;
  actor: Actor;
  data: UpdateProductData;
}

/**
 * Updates a product. Loads it (with the owner resolved up the chain) first:
 * missing/hidden → 404 before ownership; cross-owner → 403.
 */
@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(command: UpdateProductCommand): Promise<Product> {
    const found = await this.products.findByIdWithOwner(command.id);
    if (!found) {
      throw new ProductNotFoundError();
    }
    assertActorOwns(found.ownerId, command.actor);

    // TODO(Task 9): invalidate restaurant:{id}:menu after a product write.
    return this.products.update(command.id, command.data);
  }
}

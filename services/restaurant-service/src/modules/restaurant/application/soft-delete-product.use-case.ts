import { Inject, Injectable } from '@nestjs/common';
import { ProductNotFoundError } from '../domain/errors/domain.error';
import { PRODUCT_REPOSITORY } from '../domain/ports/product-repository.port';
import type { ProductRepository } from '../domain/ports/product-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface SoftDeleteProductCommand {
  id: string;
  actor: Actor;
}

/**
 * Soft-deletes a product (sets `deletedAt`). Same load-then-authorize order:
 * 404 for a missing/hidden product, 403 for a non-owner.
 */
@Injectable()
export class SoftDeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(command: SoftDeleteProductCommand): Promise<void> {
    const found = await this.products.findByIdWithOwner(command.id);
    if (!found) {
      throw new ProductNotFoundError();
    }
    assertActorOwns(found.ownerId, command.actor);

    // TODO(Task 9): invalidate restaurant:{id}:menu after a product write.
    await this.products.softDelete(command.id);
  }
}

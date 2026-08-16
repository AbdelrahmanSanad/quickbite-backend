import { SoftDeleteProductUseCase } from './soft-delete-product.use-case';
import {
  ForbiddenOwnershipError,
  ProductNotFoundError,
} from '../domain/errors/domain.error';
import type { ProductRepository } from '../domain/ports/product-repository.port';
import { Product } from '../domain/product';

function makeProduct(): Product {
  return {
    id: 'p1',
    categoryId: 'cat1',
    name: 'Burger',
    description: null,
    price: '12.50',
    isAvailable: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('SoftDeleteProductUseCase', () => {
  let products: jest.Mocked<ProductRepository>;
  let useCase: SoftDeleteProductUseCase;

  beforeEach(() => {
    products = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByCategory: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new SoftDeleteProductUseCase(products);
  });

  it('soft-deletes when the actor owns the chain', async () => {
    products.findByIdWithOwner.mockResolvedValue({
      product: makeProduct(),
      ownerId: 'owner-1',
    });

    await useCase.execute({
      id: 'p1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
    });

    expect(products.softDelete).toHaveBeenCalledWith('p1');
  });

  it('lets an ADMIN soft-delete a product they do not own', async () => {
    products.findByIdWithOwner.mockResolvedValue({
      product: makeProduct(),
      ownerId: 'owner-1',
    });

    await useCase.execute({
      id: 'p1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
    });

    expect(products.softDelete).toHaveBeenCalledWith('p1');
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not delete', async () => {
    products.findByIdWithOwner.mockResolvedValue({
      product: makeProduct(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        id: 'p1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(products.softDelete).not.toHaveBeenCalled();
  });

  it('throws ProductNotFound (404) when missing/hidden', async () => {
    products.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'p1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(products.softDelete).not.toHaveBeenCalled();
  });
});

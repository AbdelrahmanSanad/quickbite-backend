import { UpdateProductUseCase } from './update-product.use-case';
import {
  ForbiddenOwnershipError,
  ProductNotFoundError,
} from '../domain/errors/domain.error';
import type { ProductRepository } from '../domain/ports/product-repository.port';
import { Product } from '../domain/product';

function makeProduct(over: Partial<Product> = {}): Product {
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
    ...over,
  };
}

describe('UpdateProductUseCase', () => {
  let products: jest.Mocked<ProductRepository>;
  let useCase: UpdateProductUseCase;

  beforeEach(() => {
    products = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByCategory: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new UpdateProductUseCase(products);
  });

  it('updates when the actor owns the chain', async () => {
    products.findByIdWithOwner.mockResolvedValue({
      product: makeProduct(),
      ownerId: 'owner-1',
    });
    const updated = makeProduct({ price: '9.99' });
    products.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 'p1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      data: { price: 9.99 },
    });

    expect(products.update).toHaveBeenCalledWith('p1', { price: 9.99 });
    expect(result).toBe(updated);
  });

  it('lets an ADMIN update a product they do not own', async () => {
    products.findByIdWithOwner.mockResolvedValue({
      product: makeProduct(),
      ownerId: 'owner-1',
    });
    products.update.mockResolvedValue(makeProduct());

    await useCase.execute({
      id: 'p1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      data: { isAvailable: false },
    });

    expect(products.update).toHaveBeenCalled();
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not update', async () => {
    products.findByIdWithOwner.mockResolvedValue({
      product: makeProduct(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        id: 'p1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        data: { name: 'Hijacked' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(products.update).not.toHaveBeenCalled();
  });

  it('throws ProductNotFound (404) before ownership when missing/hidden', async () => {
    products.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'p1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        data: { name: 'New' },
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(products.update).not.toHaveBeenCalled();
  });
});

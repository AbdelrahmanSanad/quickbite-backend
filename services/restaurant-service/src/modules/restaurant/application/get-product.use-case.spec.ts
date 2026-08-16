import { GetProductUseCase } from './get-product.use-case';
import { ProductNotFoundError } from '../domain/errors/domain.error';
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

describe('GetProductUseCase', () => {
  let products: jest.Mocked<ProductRepository>;
  let useCase: GetProductUseCase;

  beforeEach(() => {
    products = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByCategory: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new GetProductUseCase(products);
  });

  it('returns the product when it (and its chain) are live', async () => {
    const product = makeProduct();
    products.findByIdWithOwner.mockResolvedValue({
      product,
      ownerId: 'owner-1',
    });

    await expect(useCase.execute('p1')).resolves.toBe(product);
  });

  it('throws ProductNotFound when the repo returns null (missing / soft-deleted / hidden ancestor)', async () => {
    products.findByIdWithOwner.mockResolvedValue(null);

    await expect(useCase.execute('p1')).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });
});

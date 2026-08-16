import { ListProductsUseCase } from './list-products.use-case';
import { CategoryNotFoundError } from '../domain/errors/domain.error';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import type { ProductRepository } from '../domain/ports/product-repository.port';
import { Category } from '../domain/category';
import { Product } from '../domain/product';

function makeCategory(): Category {
  return {
    id: 'cat1',
    restaurantId: 'r1',
    name: 'Mains',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('ListProductsUseCase', () => {
  let categories: jest.Mocked<CategoryRepository>;
  let products: jest.Mocked<ProductRepository>;
  let useCase: ListProductsUseCase;

  beforeEach(() => {
    categories = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    products = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByCategory: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new ListProductsUseCase(categories, products);
  });

  it('returns the category products when the parent is live', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });
    const rows: Product[] = [];
    products.listByCategory.mockResolvedValue(rows);

    await expect(useCase.execute('cat1')).resolves.toBe(rows);
    expect(products.listByCategory).toHaveBeenCalledWith('cat1');
  });

  it('throws CategoryNotFound (404) and does not list when the parent is missing/hidden', async () => {
    categories.findByIdWithOwner.mockResolvedValue(null);

    await expect(useCase.execute('cat1')).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );
    expect(products.listByCategory).not.toHaveBeenCalled();
  });
});

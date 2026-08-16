import { CreateProductUseCase } from './create-product.use-case';
import {
  CategoryNotFoundError,
  ForbiddenOwnershipError,
} from '../domain/errors/domain.error';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import type { ProductRepository } from '../domain/ports/product-repository.port';
import { Category } from '../domain/category';
import { Product } from '../domain/product';

function makeCategory(over: Partial<Category> = {}): Category {
  return {
    id: 'cat1',
    restaurantId: 'r1',
    name: 'Mains',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  };
}

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

describe('CreateProductUseCase', () => {
  let categories: jest.Mocked<CategoryRepository>;
  let products: jest.Mocked<ProductRepository>;
  let useCase: CreateProductUseCase;

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
    useCase = new CreateProductUseCase(categories, products);
  });

  it('creates a product when the actor owns the parent category', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });
    products.create.mockResolvedValue(makeProduct());

    await useCase.execute({
      categoryId: 'cat1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      name: 'Burger',
      price: 12.5,
    });

    expect(categories.findByIdWithOwner).toHaveBeenCalledWith('cat1');
    expect(products.create).toHaveBeenCalledWith({
      categoryId: 'cat1',
      name: 'Burger',
      description: null,
      price: 12.5,
      isAvailable: undefined,
      sortOrder: undefined,
    });
  });

  it('lets an ADMIN create under a category they do not own', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });
    products.create.mockResolvedValue(makeProduct());

    await useCase.execute({
      categoryId: 'cat1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      name: 'Burger',
      price: 5,
    });

    expect(products.create).toHaveBeenCalled();
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not create', async () => {
    categories.findByIdWithOwner.mockResolvedValue({
      category: makeCategory(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        categoryId: 'cat1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        name: 'Burger',
        price: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(products.create).not.toHaveBeenCalled();
  });

  it('throws CategoryNotFound (404) when the parent category is missing/hidden', async () => {
    categories.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        categoryId: 'cat1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        name: 'Burger',
        price: 5,
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(products.create).not.toHaveBeenCalled();
  });
});

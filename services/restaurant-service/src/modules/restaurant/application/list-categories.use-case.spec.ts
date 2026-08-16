import { ListCategoriesUseCase } from './list-categories.use-case';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import type { CategoryRepository } from '../domain/ports/category-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';
import { Category } from '../domain/category';
import { Restaurant } from '../domain/restaurant';

function makeRestaurant(over: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'r1',
    ownerId: 'owner-1',
    name: 'Bistro',
    description: null,
    status: 'ACTIVE',
    phone: null,
    email: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  };
}

describe('ListCategoriesUseCase', () => {
  let restaurants: jest.Mocked<RestaurantRepository>;
  let categories: jest.Mocked<CategoryRepository>;
  let useCase: ListCategoriesUseCase;

  beforeEach(() => {
    restaurants = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    categories = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new ListCategoriesUseCase(restaurants, categories);
  });

  it('returns the restaurant categories when the parent is live', async () => {
    restaurants.findById.mockResolvedValue(makeRestaurant());
    const rows: Category[] = [];
    categories.listByRestaurant.mockResolvedValue(rows);

    await expect(useCase.execute('r1')).resolves.toBe(rows);
    expect(categories.listByRestaurant).toHaveBeenCalledWith('r1');
  });

  it('throws RestaurantNotFound (404) and does not list when the parent is missing', async () => {
    restaurants.findById.mockResolvedValue(null);

    await expect(useCase.execute('r1')).rejects.toBeInstanceOf(
      RestaurantNotFoundError,
    );
    expect(categories.listByRestaurant).not.toHaveBeenCalled();
  });
});

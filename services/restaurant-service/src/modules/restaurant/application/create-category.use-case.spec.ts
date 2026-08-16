import { CreateCategoryUseCase } from './create-category.use-case';
import {
  ForbiddenOwnershipError,
  RestaurantNotFoundError,
} from '../domain/errors/domain.error';
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

function makeCategory(over: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    restaurantId: 'r1',
    name: 'Starters',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  };
}

describe('CreateCategoryUseCase', () => {
  let restaurants: jest.Mocked<RestaurantRepository>;
  let categories: jest.Mocked<CategoryRepository>;
  let useCase: CreateCategoryUseCase;

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
    useCase = new CreateCategoryUseCase(restaurants, categories);
  });

  it('creates a category (defaulting sortOrder to 0) when the actor owns the parent', async () => {
    restaurants.findById.mockResolvedValue(
      makeRestaurant({ ownerId: 'owner-1' }),
    );
    categories.create.mockResolvedValue(makeCategory());

    await useCase.execute({
      restaurantId: 'r1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      name: 'Starters',
    });

    expect(categories.create).toHaveBeenCalledWith({
      restaurantId: 'r1',
      name: 'Starters',
      sortOrder: 0,
    });
  });

  it('lets an ADMIN create under a restaurant they do not own', async () => {
    restaurants.findById.mockResolvedValue(
      makeRestaurant({ ownerId: 'owner-1' }),
    );
    categories.create.mockResolvedValue(makeCategory());

    await useCase.execute({
      restaurantId: 'r1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      name: 'Starters',
      sortOrder: 3,
    });

    expect(categories.create).toHaveBeenCalledWith({
      restaurantId: 'r1',
      name: 'Starters',
      sortOrder: 3,
    });
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not create', async () => {
    restaurants.findById.mockResolvedValue(
      makeRestaurant({ ownerId: 'owner-1' }),
    );

    await expect(
      useCase.execute({
        restaurantId: 'r1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        name: 'Starters',
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(categories.create).not.toHaveBeenCalled();
  });

  it('throws RestaurantNotFound (404) when the parent is missing/soft-deleted', async () => {
    restaurants.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        restaurantId: 'r1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        name: 'Starters',
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
    expect(categories.create).not.toHaveBeenCalled();
  });
});

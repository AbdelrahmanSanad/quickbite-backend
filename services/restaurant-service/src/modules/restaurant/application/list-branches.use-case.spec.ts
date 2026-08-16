import { ListBranchesUseCase } from './list-branches.use-case';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import type { BranchRepository } from '../domain/ports/branch-repository.port';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';
import { Branch } from '../domain/branch';
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

describe('ListBranchesUseCase', () => {
  let restaurants: jest.Mocked<RestaurantRepository>;
  let branches: jest.Mocked<BranchRepository>;
  let useCase: ListBranchesUseCase;

  beforeEach(() => {
    restaurants = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    branches = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new ListBranchesUseCase(restaurants, branches);
  });

  it('returns the restaurant branches when the parent is live', async () => {
    restaurants.findById.mockResolvedValue(makeRestaurant());
    const rows: Branch[] = [];
    branches.listByRestaurant.mockResolvedValue(rows);

    await expect(useCase.execute('r1')).resolves.toBe(rows);
    expect(branches.listByRestaurant).toHaveBeenCalledWith('r1');
  });

  it('throws RestaurantNotFound (404) and does not list when the parent is missing', async () => {
    restaurants.findById.mockResolvedValue(null);

    await expect(useCase.execute('r1')).rejects.toBeInstanceOf(
      RestaurantNotFoundError,
    );
    expect(branches.listByRestaurant).not.toHaveBeenCalled();
  });
});

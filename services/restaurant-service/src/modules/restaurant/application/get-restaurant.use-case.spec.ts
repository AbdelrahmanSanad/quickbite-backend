import { GetRestaurantUseCase } from './get-restaurant.use-case';
import { RestaurantNotFoundError } from '../domain/errors/domain.error';
import type { RestaurantRepository } from '../domain/ports/restaurant-repository.port';
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

describe('GetRestaurantUseCase', () => {
  let repo: jest.Mocked<RestaurantRepository>;
  let useCase: GetRestaurantUseCase;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new GetRestaurantUseCase(repo);
  });

  it('returns the restaurant when it exists', async () => {
    const r = makeRestaurant();
    repo.findById.mockResolvedValue(r);

    await expect(useCase.execute('r1')).resolves.toBe(r);
    expect(repo.findById).toHaveBeenCalledWith('r1');
  });

  it('throws RestaurantNotFound when missing or soft-deleted (repo returns null)', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(useCase.execute('r1')).rejects.toBeInstanceOf(
      RestaurantNotFoundError,
    );
  });
});

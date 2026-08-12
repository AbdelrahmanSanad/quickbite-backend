import { SoftDeleteRestaurantUseCase } from './soft-delete-restaurant.use-case';
import {
  ForbiddenOwnershipError,
  RestaurantNotFoundError,
} from '../domain/errors/domain.error';
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

describe('SoftDeleteRestaurantUseCase', () => {
  let repo: jest.Mocked<RestaurantRepository>;
  let useCase: SoftDeleteRestaurantUseCase;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new SoftDeleteRestaurantUseCase(repo);
  });

  it('soft-deletes when the actor owns the restaurant', async () => {
    repo.findById.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));

    await useCase.execute({
      id: 'r1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
    });

    expect(repo.softDelete).toHaveBeenCalledWith('r1');
  });

  it('lets an ADMIN soft-delete a restaurant they do not own', async () => {
    repo.findById.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));

    await useCase.execute({
      id: 'r1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
    });

    expect(repo.softDelete).toHaveBeenCalledWith('r1');
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not delete', async () => {
    repo.findById.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));

    await expect(
      useCase.execute({
        id: 'r1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('throws RestaurantNotFound (404) when the restaurant is missing', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'r1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});

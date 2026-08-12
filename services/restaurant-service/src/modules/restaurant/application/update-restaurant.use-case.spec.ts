import { UpdateRestaurantUseCase } from './update-restaurant.use-case';
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

describe('UpdateRestaurantUseCase', () => {
  let repo: jest.Mocked<RestaurantRepository>;
  let useCase: UpdateRestaurantUseCase;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new UpdateRestaurantUseCase(repo);
  });

  it('updates when the actor owns the restaurant', async () => {
    repo.findById.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));
    const updated = makeRestaurant({ name: 'New' });
    repo.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 'r1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      data: { name: 'New' },
    });

    expect(repo.update).toHaveBeenCalledWith('r1', { name: 'New' });
    expect(result).toBe(updated);
  });

  it('lets an ADMIN update a restaurant they do not own', async () => {
    repo.findById.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));
    repo.update.mockResolvedValue(makeRestaurant({ name: 'New' }));

    await useCase.execute({
      id: 'r1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      data: { name: 'New' },
    });

    expect(repo.update).toHaveBeenCalled();
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not update', async () => {
    repo.findById.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));

    await expect(
      useCase.execute({
        id: 'r1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        data: { name: 'New' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws RestaurantNotFound (404) before checking ownership when missing', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'r1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        data: { name: 'New' },
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

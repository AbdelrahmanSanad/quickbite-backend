import { CreateRestaurantUseCase } from './create-restaurant.use-case';
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

describe('CreateRestaurantUseCase', () => {
  let repo: jest.Mocked<RestaurantRepository>;
  let useCase: CreateRestaurantUseCase;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new CreateRestaurantUseCase(repo);
  });

  it('persists the restaurant with ownerId from the caller identity', async () => {
    repo.create.mockResolvedValue(makeRestaurant({ ownerId: 'owner-1' }));

    const result = await useCase.execute({
      ownerId: 'owner-1',
      name: 'Bistro',
      description: 'Cozy',
      phone: '123',
      email: 'a@b.co',
    });

    expect(repo.create).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      name: 'Bistro',
      description: 'Cozy',
      phone: '123',
      email: 'a@b.co',
    });
    expect(result.ownerId).toBe('owner-1');
  });

  it('normalizes omitted optional fields to null', async () => {
    repo.create.mockResolvedValue(makeRestaurant());

    await useCase.execute({ ownerId: 'owner-1', name: 'Bistro' });

    expect(repo.create).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      name: 'Bistro',
      description: null,
      phone: null,
      email: null,
    });
  });
});

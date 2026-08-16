import { CreateBranchUseCase } from './create-branch.use-case';
import {
  ForbiddenOwnershipError,
  RestaurantNotFoundError,
} from '../domain/errors/domain.error';
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

function makeBranch(over: Partial<Branch> = {}): Branch {
  return {
    id: 'b1',
    restaurantId: 'r1',
    name: 'Downtown',
    address: '1 Main St',
    phone: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  };
}

describe('CreateBranchUseCase', () => {
  let restaurants: jest.Mocked<RestaurantRepository>;
  let branches: jest.Mocked<BranchRepository>;
  let useCase: CreateBranchUseCase;

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
    useCase = new CreateBranchUseCase(restaurants, branches);
  });

  it('creates a branch when the actor owns the parent restaurant', async () => {
    restaurants.findById.mockResolvedValue(
      makeRestaurant({ ownerId: 'owner-1' }),
    );
    branches.create.mockResolvedValue(makeBranch());

    await useCase.execute({
      restaurantId: 'r1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      name: 'Downtown',
      address: '1 Main St',
    });

    expect(branches.create).toHaveBeenCalledWith({
      restaurantId: 'r1',
      name: 'Downtown',
      address: '1 Main St',
      phone: null,
    });
  });

  it('lets an ADMIN create under a restaurant they do not own', async () => {
    restaurants.findById.mockResolvedValue(
      makeRestaurant({ ownerId: 'owner-1' }),
    );
    branches.create.mockResolvedValue(makeBranch());

    await useCase.execute({
      restaurantId: 'r1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      name: 'Downtown',
      address: '1 Main St',
    });

    expect(branches.create).toHaveBeenCalled();
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not create', async () => {
    restaurants.findById.mockResolvedValue(
      makeRestaurant({ ownerId: 'owner-1' }),
    );

    await expect(
      useCase.execute({
        restaurantId: 'r1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        name: 'Downtown',
        address: '1 Main St',
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(branches.create).not.toHaveBeenCalled();
  });

  it('throws RestaurantNotFound (404) when the parent is missing/soft-deleted', async () => {
    restaurants.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        restaurantId: 'r1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        name: 'Downtown',
        address: '1 Main St',
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
    expect(branches.create).not.toHaveBeenCalled();
  });
});

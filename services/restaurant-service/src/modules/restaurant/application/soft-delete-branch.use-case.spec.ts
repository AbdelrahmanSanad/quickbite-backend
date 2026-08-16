import { SoftDeleteBranchUseCase } from './soft-delete-branch.use-case';
import {
  BranchNotFoundError,
  ForbiddenOwnershipError,
} from '../domain/errors/domain.error';
import type { BranchRepository } from '../domain/ports/branch-repository.port';
import { Branch } from '../domain/branch';

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

describe('SoftDeleteBranchUseCase', () => {
  let branches: jest.Mocked<BranchRepository>;
  let useCase: SoftDeleteBranchUseCase;

  beforeEach(() => {
    branches = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new SoftDeleteBranchUseCase(branches);
  });

  it('soft-deletes when the actor owns the parent restaurant', async () => {
    branches.findByIdWithOwner.mockResolvedValue({
      branch: makeBranch(),
      ownerId: 'owner-1',
    });

    await useCase.execute({
      id: 'b1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
    });

    expect(branches.softDelete).toHaveBeenCalledWith('b1');
  });

  it('lets an ADMIN soft-delete a branch they do not own', async () => {
    branches.findByIdWithOwner.mockResolvedValue({
      branch: makeBranch(),
      ownerId: 'owner-1',
    });

    await useCase.execute({
      id: 'b1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
    });

    expect(branches.softDelete).toHaveBeenCalledWith('b1');
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not delete', async () => {
    branches.findByIdWithOwner.mockResolvedValue({
      branch: makeBranch(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        id: 'b1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(branches.softDelete).not.toHaveBeenCalled();
  });

  it('throws BranchNotFound (404) when missing/hidden', async () => {
    branches.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'b1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      }),
    ).rejects.toBeInstanceOf(BranchNotFoundError);
    expect(branches.softDelete).not.toHaveBeenCalled();
  });
});

import { UpdateBranchUseCase } from './update-branch.use-case';
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

describe('UpdateBranchUseCase', () => {
  let branches: jest.Mocked<BranchRepository>;
  let useCase: UpdateBranchUseCase;

  beforeEach(() => {
    branches = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new UpdateBranchUseCase(branches);
  });

  it('updates when the actor owns the parent restaurant', async () => {
    branches.findByIdWithOwner.mockResolvedValue({
      branch: makeBranch(),
      ownerId: 'owner-1',
    });
    const updated = makeBranch({ isActive: false });
    branches.update.mockResolvedValue(updated);

    const result = await useCase.execute({
      id: 'b1',
      actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
      data: { isActive: false },
    });

    expect(branches.update).toHaveBeenCalledWith('b1', { isActive: false });
    expect(result).toBe(updated);
  });

  it('lets an ADMIN update a branch they do not own', async () => {
    branches.findByIdWithOwner.mockResolvedValue({
      branch: makeBranch(),
      ownerId: 'owner-1',
    });
    branches.update.mockResolvedValue(makeBranch());

    await useCase.execute({
      id: 'b1',
      actor: { userId: 'admin-9', role: 'ADMIN' },
      data: { name: 'Renamed' },
    });

    expect(branches.update).toHaveBeenCalled();
  });

  it('rejects a non-owner with ForbiddenOwnership (403) and does not update', async () => {
    branches.findByIdWithOwner.mockResolvedValue({
      branch: makeBranch(),
      ownerId: 'owner-1',
    });

    await expect(
      useCase.execute({
        id: 'b1',
        actor: { userId: 'someone-else', role: 'RESTAURANT_OWNER' },
        data: { name: 'Hijacked' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenOwnershipError);
    expect(branches.update).not.toHaveBeenCalled();
  });

  it('throws BranchNotFound (404) before ownership when missing/hidden', async () => {
    branches.findByIdWithOwner.mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: 'b1',
        actor: { userId: 'owner-1', role: 'RESTAURANT_OWNER' },
        data: { name: 'New' },
      }),
    ).rejects.toBeInstanceOf(BranchNotFoundError);
    expect(branches.update).not.toHaveBeenCalled();
  });
});

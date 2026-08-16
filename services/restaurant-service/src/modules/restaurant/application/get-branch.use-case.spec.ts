import { GetBranchUseCase } from './get-branch.use-case';
import { BranchNotFoundError } from '../domain/errors/domain.error';
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

describe('GetBranchUseCase', () => {
  let branches: jest.Mocked<BranchRepository>;
  let useCase: GetBranchUseCase;

  beforeEach(() => {
    branches = {
      create: jest.fn(),
      findByIdWithOwner: jest.fn(),
      listByRestaurant: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new GetBranchUseCase(branches);
  });

  it('returns the branch when it (and its parent) are live', async () => {
    const branch = makeBranch();
    branches.findByIdWithOwner.mockResolvedValue({
      branch,
      ownerId: 'owner-1',
    });

    await expect(useCase.execute('b1')).resolves.toBe(branch);
  });

  it('throws BranchNotFound when the repo returns null (missing / soft-deleted / hidden parent)', async () => {
    branches.findByIdWithOwner.mockResolvedValue(null);

    await expect(useCase.execute('b1')).rejects.toBeInstanceOf(
      BranchNotFoundError,
    );
  });
});

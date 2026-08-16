import { Inject, Injectable } from '@nestjs/common';
import { BranchNotFoundError } from '../domain/errors/domain.error';
import { Branch } from '../domain/branch';
import { BRANCH_REPOSITORY } from '../domain/ports/branch-repository.port';
import type { BranchRepository } from '../domain/ports/branch-repository.port';

/**
 * Reads a single branch. Public. Invisible when the branch OR its parent
 * restaurant is soft-deleted (the repository filters up the chain), surfacing as
 * a 404 identical to a non-existent id.
 */
@Injectable()
export class GetBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepository,
  ) {}

  async execute(id: string): Promise<Branch> {
    const found = await this.branches.findByIdWithOwner(id);
    if (!found) {
      throw new BranchNotFoundError();
    }
    return found.branch;
  }
}

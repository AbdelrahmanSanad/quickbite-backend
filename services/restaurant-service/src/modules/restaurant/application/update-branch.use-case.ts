import { Inject, Injectable } from '@nestjs/common';
import { BranchNotFoundError } from '../domain/errors/domain.error';
import { Branch } from '../domain/branch';
import { BRANCH_REPOSITORY } from '../domain/ports/branch-repository.port';
import type {
  BranchRepository,
  UpdateBranchData,
} from '../domain/ports/branch-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface UpdateBranchCommand {
  id: string;
  actor: Actor;
  data: UpdateBranchData;
}

/**
 * Updates a branch. Loads it (with the parent's ownerId, up-the-chain visible)
 * first: missing/hidden → 404 before ownership; cross-owner → 403.
 */
@Injectable()
export class UpdateBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepository,
  ) {}

  async execute(command: UpdateBranchCommand): Promise<Branch> {
    const found = await this.branches.findByIdWithOwner(command.id);
    if (!found) {
      throw new BranchNotFoundError();
    }
    assertActorOwns(found.ownerId, command.actor);

    return this.branches.update(command.id, command.data);
  }
}

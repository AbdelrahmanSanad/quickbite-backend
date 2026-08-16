import { Inject, Injectable } from '@nestjs/common';
import { BranchNotFoundError } from '../domain/errors/domain.error';
import { BRANCH_REPOSITORY } from '../domain/ports/branch-repository.port';
import type { BranchRepository } from '../domain/ports/branch-repository.port';
import { Actor, assertActorOwns } from './ownership';

export interface SoftDeleteBranchCommand {
  id: string;
  actor: Actor;
}

/**
 * Soft-deletes a branch (sets `deletedAt`). Same load-then-authorize order as
 * update: 404 for a missing/hidden branch, 403 for a non-owner.
 */
@Injectable()
export class SoftDeleteBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY)
    private readonly branches: BranchRepository,
  ) {}

  async execute(command: SoftDeleteBranchCommand): Promise<void> {
    const found = await this.branches.findByIdWithOwner(command.id);
    if (!found) {
      throw new BranchNotFoundError();
    }
    assertActorOwns(found.ownerId, command.actor);

    await this.branches.softDelete(command.id);
  }
}

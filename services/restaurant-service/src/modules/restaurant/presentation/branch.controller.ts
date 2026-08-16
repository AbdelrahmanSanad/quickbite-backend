import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@quickbite/nest-auth';
import type { AuthenticatedUser } from '@quickbite/nest-auth';
import { GetBranchUseCase } from '../application/get-branch.use-case';
import { SoftDeleteBranchUseCase } from '../application/soft-delete-branch.use-case';
import { UpdateBranchUseCase } from '../application/update-branch.use-case';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchResponse, toBranchResponse } from './branch.response';

/**
 * Flat branch routes addressed by branch id: get (public), update + delete
 * (owner|admin — ownership resolves up to the parent restaurant).
 */
@Controller('branches')
export class BranchController {
  constructor(
    private readonly getBranch: GetBranchUseCase,
    private readonly updateBranch: UpdateBranchUseCase,
    private readonly softDeleteBranch: SoftDeleteBranchUseCase,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BranchResponse> {
    const branch = await this.getBranch.execute(id);
    return toBranchResponse(branch);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchResponse> {
    const branch = await this.updateBranch.execute({
      id,
      actor: { userId: user.userId, role: user.role },
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        isActive: dto.isActive,
      },
    });
    return toBranchResponse(branch);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.softDeleteBranch.execute({
      id,
      actor: { userId: user.userId, role: user.role },
    });
  }
}

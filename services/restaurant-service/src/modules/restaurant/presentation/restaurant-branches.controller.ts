import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateBranchUseCase } from '../application/create-branch.use-case';
import { ListBranchesUseCase } from '../application/list-branches.use-case';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BranchResponse, toBranchResponse } from './branch.response';

/**
 * Branch routes nested under a restaurant: create (owner) and list (public).
 * `ownerId` for the create authorization is resolved from the parent
 * restaurant, never from the request.
 */
@Controller('restaurants/:restaurantId/branches')
export class RestaurantBranchesController {
  constructor(
    private readonly createBranch: CreateBranchUseCase,
    private readonly listBranches: ListBranchesUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
  ): Promise<BranchResponse> {
    const branch = await this.createBranch.execute({
      restaurantId,
      actor: { userId: user.userId, role: user.role },
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
    });
    return toBranchResponse(branch);
  }

  @Get()
  async list(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ): Promise<BranchResponse[]> {
    const branches = await this.listBranches.execute(restaurantId);
    return branches.map(toBranchResponse);
  }
}

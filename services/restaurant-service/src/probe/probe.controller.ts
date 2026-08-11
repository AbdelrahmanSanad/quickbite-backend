import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  Role,
  Roles,
  RolesGuard,
} from '@quickbite/nest-auth';
import type { AuthenticatedUser } from '@quickbite/nest-auth';

/**
 * Task-4 integration probe for the shared auth guards. Demonstrates AuthN
 * (`/me`, any valid token) and AuthZ (`/owner-check`, RESTAURANT_OWNER/ADMIN).
 * Replaced by the real Restaurant endpoints (with ownership checks) in Task 5.
 */
@Controller()
export class ProbeController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTAURANT_OWNER)
  @Get('owner-check')
  ownerCheck(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, userId: user.userId, role: user.role };
  }
}

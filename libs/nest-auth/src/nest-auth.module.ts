import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * Shared auth for any service that validates the access JWT locally.
 * Import this module; the consuming app must expose `JWT_ACCESS_SECRET` through
 * a global ConfigModule. Provides + exports JwtAuthGuard and RolesGuard for use
 * with `@UseGuards(...)`.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard, RolesGuard],
  // Re-export JwtModule so the guards' JwtService dependency resolves in the
  // consuming module where `@UseGuards(...)` is applied.
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class NestAuthModule {}

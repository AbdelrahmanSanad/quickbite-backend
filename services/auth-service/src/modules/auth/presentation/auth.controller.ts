import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';
import { ForgotPasswordUseCase } from '../application/forgot-password.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutAllUseCase } from '../application/logout-all.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { VerifyEmailUseCase } from '../application/verify-email.use-case';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './security/authenticated-user';

// Auth endpoints are sensitive — tighter than the global default (10 req/min/IP).
@ApiTags('auth')
@Throttle({ default: { limit: 10, ttl: seconds(60) } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer (status PENDING)' })
  @ApiResponse({
    status: 201,
    description: 'Registered; verification email sent.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (weak password, bad email).',
  })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.registerUser.execute(dto);
    return {
      id: result.id,
      email: result.email,
      status: result.status,
      message: 'Registration successful. Please verify your email.',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email with the token and activate the account',
  })
  @ApiResponse({ status: 200, description: 'Email verified; account active.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token.',
  })
  @ApiResponse({ status: 429, description: 'Too many verification attempts.' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.verifyEmailUseCase.execute(dto);
    return {
      verified: true,
      message: 'Email verified successfully. Your account is now active.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate and open a session (access + refresh tokens)',
  })
  @ApiResponse({ status: 200, description: 'Authenticated; tokens returned.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({
    status: 403,
    description: 'Email not verified or account not active.',
  })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      deviceName: dto.deviceName ?? null,
      deviceType: dto.deviceType ?? null,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
  })
  @ApiResponse({ status: 200, description: 'New access + refresh tokens.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid, revoked, or expired refresh token.',
  })
  async refresh(@Body() dto: RefreshDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke the session behind the refresh token (idempotent)',
  })
  @ApiResponse({ status: 200, description: 'Logged out.' })
  async logout(@Body() dto: LogoutDto) {
    await this.logoutUseCase.execute(dto);
    return { success: true, message: 'Logged out.' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Revoke all of the user's sessions (sign out everywhere)",
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked; returns revokedCount.',
  })
  async logoutAll(@Body() dto: LogoutDto) {
    const { revokedCount } = await this.logoutAllUseCase.execute(dto);
    return {
      success: true,
      revokedCount,
      message: 'Logged out of all devices.',
    };
  }

  // Stricter: OTP issuance is abuse-prone (email spam / enumeration probing).
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password-reset OTP (no enumeration)' })
  @ApiResponse({
    status: 200,
    description: 'Always succeeds, whether or not the email exists.',
  })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.forgotPasswordUseCase.execute(dto);
    // Same response whether or not the email exists (no enumeration).
    return {
      success: true,
      message:
        'If an account exists for that email, a reset code has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset the password with an OTP and revoke all sessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset; all sessions revoked.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset code.' })
  @ApiResponse({ status: 429, description: 'Too many reset attempts.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(dto);
    return {
      success: true,
      message: 'Password has been reset. Please log in again.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Return the authenticated user (requires a Bearer access token)',
  })
  @ApiResponse({ status: 200, description: 'The authenticated identity.' })
  @ApiResponse({
    status: 401,
    description: 'Missing, malformed, invalid, or expired access token.',
  })
  getCurrentUser(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { seconds, Throttle } from '@nestjs/throttler';
import { ForgotPasswordUseCase } from '../application/forgot-password.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import { LogoutAllUseCase } from '../application/logout-all.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { VerifyEmailUseCase } from '../application/verify-email.use-case';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

// Auth endpoints are sensitive — tighter than the global default (10 req/min/IP).
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
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.verifyEmailUseCase.execute(dto);
    return {
      verified: true,
      message: 'Email verified successfully. Your account is now active.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
  async refresh(@Body() dto: RefreshDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto) {
    await this.logoutUseCase.execute(dto);
    return { success: true, message: 'Logged out.' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
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
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(dto);
    return {
      success: true,
      message: 'Password has been reset. Please log in again.',
    };
  }
}

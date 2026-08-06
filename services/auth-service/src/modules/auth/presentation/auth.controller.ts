import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { LoginUseCase } from '../application/login.use-case';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { VerifyEmailUseCase } from '../application/verify-email.use-case';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
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
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

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
}

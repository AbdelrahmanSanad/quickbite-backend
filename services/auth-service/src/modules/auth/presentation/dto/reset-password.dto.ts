import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsStrongPassword,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'ada@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: '482913',
    description: '6-digit OTP from the email.',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  otp!: string;

  @ApiProperty({
    example: 'NewStrongP@ss1',
    description: 'Min 8 chars with upper, lower, number, and symbol.',
  })
  @IsString()
  @MaxLength(128)
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword!: string;
}

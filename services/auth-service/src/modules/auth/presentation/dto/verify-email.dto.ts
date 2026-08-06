import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  token!: string;
}

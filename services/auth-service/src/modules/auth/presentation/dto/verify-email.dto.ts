import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: '0b86e834-cd7d-4711-a9f5-8cd8152f1922',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'a9LE23-sCpokL5U-2x4tpMwe9C7iQstckEK7xPNaQjM' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  token!: string;
}

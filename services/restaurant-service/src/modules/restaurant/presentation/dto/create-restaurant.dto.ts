import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Body for `POST /restaurants`. Identity is NEVER accepted here — `ownerId`
 * comes from the JWT. `forbidNonWhitelisted` (global ValidationPipe) rejects any
 * extra field (e.g. a smuggled `ownerId` or `status`) with a 400.
 */
export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

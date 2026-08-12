import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Body for `PATCH /restaurants/:id`. All fields optional (partial update).
 * `status` is intentionally NOT settable by an owner — an ADMIN-only SUSPEND
 * transition is a separate, later concern. Any unknown field is rejected (400).
 */
export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

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

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /restaurants/:restaurantId/branches`. `isActive` is NOT
 * accepted on create (defaults true in the schema) — `forbidNonWhitelisted`
 * rejects it, along with any other extra field, with a 400.
 */
export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

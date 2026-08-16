import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Body for `POST /restaurants/:restaurantId/categories`. `forbidNonWhitelisted`
 * rejects any extra field (400). Duplicate live names are enforced at the DB and
 * surface as 409, not here.
 */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

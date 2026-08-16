import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Sane upper bound. Also keeps `price` well under 2^53/100, so passing the DTO
// number straight to the Decimal(10,2) column is precision-safe. If this is ever
// raised toward the column's true ceiling (99_999_999.99), convert to a string
// at the boundary instead of relying on JS number precision.
const MAX_PRICE = 1_000_000;

/**
 * Body for `POST /categories/:categoryId/products`. `price` is a JSON number,
 * validated > 0 with at most 2 decimal places and a sane upper bound (defense in
 * depth alongside the DB `CHECK (price > 0)`). `forbidNonWhitelisted` rejects
 * extra fields (400).
 */
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // @IsPositive already excludes 0 and negatives; maxDecimalPlaces rejects >2dp.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_PRICE)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

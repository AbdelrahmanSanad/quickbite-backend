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

// See create-product.dto.ts: this bound also guarantees number→Decimal precision
// safety; converting to a string at the boundary is needed if it is ever raised.
const MAX_PRICE = 1_000_000;

/**
 * Body for `PATCH /products/:id`. All fields optional (partial update). `price`,
 * when present, follows the same > 0 / ≤2dp / ≤ max rules as create. Unknown
 * fields → 400.
 */
export class UpdateProductDto {
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
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_PRICE)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

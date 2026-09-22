import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Decimal em string, ex.: "12.50"' })
  @IsOptional()
  @IsNumberString()
  costPrice?: string;

  @ApiProperty({ description: 'Decimal em string, ex.: "29.90"' })
  @IsNumberString()
  salePrice: string;

  @ApiPropertyOptional({ default: "UN" })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockQty?: number;

  @ApiPropertyOptional({ description: "Endereço físico na oficina" })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

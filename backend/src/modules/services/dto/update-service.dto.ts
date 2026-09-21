import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Preço padrão, em reais" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "Tempo estimado, em minutos" })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Ativa/desativa o serviço no catálogo" })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

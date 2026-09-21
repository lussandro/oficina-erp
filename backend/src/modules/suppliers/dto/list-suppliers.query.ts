import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ListSuppliersQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: "Busca em razão social, nome fantasia e CNPJ",
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  // @Type(() => Boolean) trata qualquer string não vazia como true — "false" viraria
  // true. Achado real no Épico 2 (PR #5, BAC-68); mesmo Transform explícito aqui.
  @Transform(({ value }) =>
    value === true || value === "true"
      ? true
      : value === false || value === "false"
        ? false
        : value,
  )
  @IsBoolean()
  active?: boolean;
}

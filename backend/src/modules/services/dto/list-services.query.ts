import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ListServicesQuery {
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

  @ApiPropertyOptional({ description: "Busca em nome e descrição" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  // ?active=false não pode virar true: ver bug real corrigido no PR #5 (BAC-68)
  // para ListUsersQuery. @Type(() => Boolean) trataria qualquer string como truthy.
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

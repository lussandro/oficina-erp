import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FuelType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { normalizePlate, PLATE_PATTERN } from "../../../common/utils/plate";

// Faixa do ano: a referência validava "ano-120 até ano+3" no formulário
// (REFERENCE_ANALYSIS.md); aqui a mesma faixa vale para qualquer cliente HTTP,
// não só para quem usa a tela.
const MAX_YEAR = new Date().getFullYear() + 1;
const MIN_YEAR = MAX_YEAR - 123;

const toPlate = ({ value }: { value: unknown }) =>
  typeof value === "string" ? normalizePlate(value) : value;

const toUpper = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class CreateVehicleDto {
  @ApiProperty({
    description: "Placa, padrão antigo (ABC1234) ou Mercosul (ABC1D23)",
  })
  @Transform(toPlate)
  @Matches(PLATE_PATTERN, { message: "Placa inválida" })
  plate: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  brand: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  model: string;

  @ApiPropertyOptional({ description: "Ano do modelo" })
  @IsOptional()
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  modelYear?: number;

  @ApiPropertyOptional({ description: "Ano de fabricação" })
  @IsOptional()
  @IsInt()
  @Min(MIN_YEAR)
  @Max(MAX_YEAR)
  makeYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({
    description: "Chassi (VIN). 17 caracteres; não usa I, O nem Q.",
  })
  @IsOptional()
  @Transform(toUpper)
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, { message: "Chassi inválido" })
  vin?: string;

  @ApiPropertyOptional({ description: "Quilometragem atual" })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "Cliente dono do veículo" })
  @IsUUID()
  customerId: string;
}

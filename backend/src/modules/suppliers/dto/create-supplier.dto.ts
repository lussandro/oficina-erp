import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from "class-validator";
import { IsCnpj } from "../../../common/validators/is-cnpj.validator";
import { onlyDigits } from "../../../common/utils/document";

const toDigits = ({ value }: { value: unknown }) =>
  typeof value === "string" ? onlyDigits(value) : value;

const toUpper = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.toUpperCase() : value;

export class CreateSupplierDto {
  @ApiProperty({ description: "CNPJ, com ou sem máscara" })
  @Transform(toDigits)
  @IsCnpj()
  document: string;

  @ApiProperty({ description: "Razão social" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ description: "Nome fantasia" })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description: "CEP, usado para preencher o endereço via ViaCEP",
  })
  @IsOptional()
  @Transform(toDigits)
  @Length(8, 8)
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "UF, 2 letras" })
  @IsOptional()
  @Transform(toUpper)
  @Length(2, 2)
  state?: string;
}

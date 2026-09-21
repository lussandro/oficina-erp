import { ApiPropertyOptional } from "@nestjs/swagger";
import { PersonType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from "class-validator";
import { IsCpfCnpj } from "../../../common/validators/is-cpf-cnpj.validator";
import { onlyDigits } from "../../../common/utils/document";

const toDigits = ({ value }: { value: unknown }) =>
  typeof value === "string" ? onlyDigits(value) : value;

const toUpper = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.toUpperCase() : value;

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: PersonType })
  @IsOptional()
  @IsEnum(PersonType)
  personType?: PersonType;

  @ApiPropertyOptional({ description: "CPF ou CNPJ, com ou sem máscara" })
  @IsOptional()
  @Transform(toDigits)
  @IsCpfCnpj()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

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
  @MinLength(8)
  phoneAlt?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Ativa/reativa o cliente" })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

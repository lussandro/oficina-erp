import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PersonType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
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

export class CreateCustomerDto {
  @ApiPropertyOptional({ enum: PersonType, default: PersonType.PF })
  @IsOptional()
  @IsEnum(PersonType)
  personType: PersonType = PersonType.PF;

  @ApiProperty({ description: "CPF ou CNPJ, com ou sem máscara" })
  @Transform(toDigits)
  @IsCpfCnpj()
  document: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "Telefone principal" })
  @IsString()
  @MinLength(8)
  phone: string;

  @ApiPropertyOptional({
    description: "WhatsApp, quando diferente do telefone principal",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  phoneAlt?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";
import { isValidCNPJ, isValidCPF } from "../utils/document";

// Tamanho do documento (11 ou 14 dígitos) decide qual checksum aplicar —
// não depende de `personType` do DTO, que num PATCH parcial pode não vir
// junto com `document`. Precisa rodar depois de normalizar para dígitos
// (ver @Transform no DTO).
export function IsCpfCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isCpfCnpj",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== "string") return false;
          if (value.length === 14) return isValidCNPJ(value);
          return isValidCPF(value);
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value as string;
          return value?.length === 14 ? "CNPJ inválido" : "CPF inválido";
        },
      },
    });
  };
}

import { registerDecorator, ValidationOptions } from "class-validator";
import { isValidCNPJ } from "../utils/document";

// Fornecedor é sempre PJ (schema: `document` = CNPJ, somente dígitos), então
// aceitar CPF aqui seria aceitar um documento que o cadastro não admite.
// Precisa rodar depois de normalizar para dígitos (ver @Transform no DTO).
export function IsCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isCnpj",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === "string" && isValidCNPJ(value);
        },
        defaultMessage() {
          return "CNPJ inválido";
        },
      },
    });
  };
}

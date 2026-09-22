// Placa de veículo: padrão antigo (AAA1234) e Mercosul (ABC1D23).
// Normalizada em maiúsculas e sem separador antes de gravar — o `plate` é
// `@unique` no schema, então "abc-1234" e "ABC1234" precisam ser a mesma chave.

export const PLATE_PATTERN = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(value: string): boolean {
  return PLATE_PATTERN.test(normalizePlate(value));
}

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Aceita "15m", "7d", "1h" — o mesmo formato usado em JWT_EXPIRES_IN/JWT_REFRESH_EXPIRES_IN.
export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Duração inválida: "${value}" (formato esperado: 15m, 7d, 1h)`,
    );
  }
  return Number(match[1]) * UNIT_MS[match[2]];
}

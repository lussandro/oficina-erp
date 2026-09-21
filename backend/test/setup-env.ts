// ADR-0003: sem default inseguro, nem aqui. Suíte de integração recusa rodar
// sem apontar para um Postgres de verdade e sem os segredos de teste virem de
// fora — mesma regra do main.ts, aplicada ao ambiente de teste.
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Integração precisa de banco real (docs/TESTING.md §4). Variável(is) ausente(s): ${missing.join(", ")}`,
  );
}

process.env.JWT_EXPIRES_IN ??= "15m";
process.env.JWT_REFRESH_EXPIRES_IN ??= "7d";

# Backend — NestJS

API em NestJS 10 + Prisma 5 (PostgreSQL). Estrutura de camadas e regras em
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §3; contrato de rotas em
[`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

## Rodando localmente

Requer `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (ver `.env.example` na raiz).

```bash
npm install
npx prisma migrate deploy
npm run start:dev
```

Documentação OpenAPI em `/api/docs`.

## Admin inicial

`npm run seed` cria o primeiro usuário ADMIN — exige `SEED_ADMIN_EMAIL` e
`SEED_ADMIN_PASSWORD` no ambiente (ADR-0006). Sem default inseguro: falha se
faltar alguma das duas. Idempotente — não faz nada se já existir um ADMIN.

## Testes

```bash
npm run lint
npm run build
npm test
```

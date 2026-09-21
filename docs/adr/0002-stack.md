# ADR-0002 — NestJS + Prisma + PostgreSQL + Next.js

**Status:** Aceito · 2026-09-21

## Contexto

O plano do BAC-33 propôs esta stack e determinou que qualquer desvio exigiria
ADR com justificativa. Cabia ao Épico 0 confirmar ou desviar.

## Decisão

Confirmar a stack, sem desvio.

- **NestJS**: estrutura de módulos/DI já definida evita que cada agente invente
  a sua — importante com Backend, Frontend, SRE e Reviewer trabalhando em
  paralelo. Swagger sai dos decorators, então o contrato não desatualiza.
- **Prisma**: schema único e legível serve de documento compartilhado; migrations
  versionadas; tipos gerados eliminam a classe de bug "campo que não existe".
- **PostgreSQL 16**: enums nativos, transações, `numeric` exato, e é o que o
  modelo precisa. A referência suportava 4 bancos e não usava recurso de nenhum.
- **Next.js + Tailwind**: App Router, TypeScript, e Tailwind casa com a exigência
  de design system por tokens.

TypeScript nas duas pontas: um agente atravessa backend e frontend sem trocar de
linguagem, e os tipos do contrato podem ser gerados a partir do OpenAPI.

## Alternativas descartadas

- **Express puro**: mais leve, mas cada módulo inventaria sua convenção. Com
  vários agentes escrevendo em paralelo, convenção imposta vale mais que enxugar.
- **TypeORM/Drizzle**: funcionariam. Prisma ganha pelo schema como artefato de
  comunicação entre agentes.
- **Monólito Next.js com Server Actions**: menos código, mas o briefing pede API
  documentada e frontend desacoplado.

## Consequências

- Três contêineres para subir, não um.
- `prisma generate` precisa rodar antes do build do backend (entra no Dockerfile e no CI).
- Nenhuma das 15 lacunas da referência é resolvida pela stack — todas dependem de
  modelagem e regra de negócio explícitas.

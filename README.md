# Oficina ERP

Sistema de gestão para oficina mecânica: clientes, veículos, serviços, peças,
estoque, orçamentos e ordens de serviço.

Repositório privado — o sistema guarda dado pessoal de cliente (nome, CPF/CNPJ,
telefone, endereço, veículo e histórico).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS · TypeScript · Prisma · PostgreSQL 16 |
| API | REST documentada em OpenAPI 3 (Swagger) |
| Frontend | Next.js (App Router) · TypeScript · Tailwind CSS |
| Infra | Docker Compose · GitHub Actions |
| Testes | Jest + Supertest (backend) · Vitest + Testing Library (frontend) · Playwright (E2E) |

Racional das escolhas: [`docs/adr/`](./docs/adr/).

## Estado atual

Este repositório está no fim do **Épico 1 (Infraestrutura inicial)**. Além da
fundação do Épico 0 (documentação, ADRs, modelo de dados), agora existem
`backend/Dockerfile` e `frontend/Dockerfile` (build multi-stage Node 20) e
healthcheck nos três serviços do Compose.

**O backend e o frontend ainda não têm código de aplicação** — isso é escopo
dos próximos épicos (Épico 2+). Por isso os serviços `backend` e `frontend` do
`docker-compose.yml` seguem sob o profile `app`: `docker compose up -d db` sobe
só o banco; `docker compose --profile app up --build` tenta o build completo e
falha até o código chegar. Remover o profile é decisão dos épicos que
entregarem esse código, não desta issue.

## Como subir

Pré-requisitos: Docker e Docker Compose.

```bash
cp .env.example .env
# Preencha, no mínimo: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET,
# SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.
# Sem elas o Compose recusa subir — não existe senha padrão (ADR-0006).

# Hoje (Épico 0): apenas o banco.
docker compose up -d db

# A partir do Épico 1: o sistema inteiro.
docker compose --profile app up --build
```

| Serviço | URL | Disponível |
|---|---|---|
| Postgres | localhost:5432 | agora |
| API | http://localhost:3001/api/v1 | Épico 1+ |
| Swagger | http://localhost:3001/api/docs | Épico 1+ |
| Frontend | http://localhost:3000 | Épico 1+ |

Quando backend e frontend existirem, a primeira subida com banco vazio roda as
migrations e o seed cria o administrador com `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. Nenhum passo manual.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitetura, camadas, modelo de dados, RBAC, padrões de API |
| [docs/REFERENCE_ANALYSIS.md](./docs/REFERENCE_ANALYSIS.md) | Análise do sistema de referência e suas lacunas |
| [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) | Contrato de API entre backend e frontend |
| [docs/adr/](./docs/adr/) | Decisões de arquitetura e seus trade-offs |

## Estrutura

```
backend/          API NestJS
  prisma/         schema.prisma, migrations, seed
frontend/         aplicação Next.js
  src/components/ design system (usar antes de escrever JSX novo)
  src/app/        rotas e globals.css (tokens de cor e tipografia)
docs/             arquitetura, análise, contrato de API, ADRs
.github/          CI
```

## Convenções

- Branch por tarefa (`feature/<modulo>`), PR sempre, nunca commit direto na principal.
- Nenhuma credencial em repositório, issue, comentário ou log. Segredo vive em
  GitHub Secrets.
- Toda tarefa carrega critério de aceite executável. "Buildou" não é evidência:
  evidência é a saída do comando.
- Tela: cor vem de token, nunca literal. Componente antes de elemento cru.
  Estado vazio, carregando e erro fazem parte da entrega.

## Licença

MIT — ver [LICENSE](./LICENSE), incluída a atribuição ao projeto de referência.

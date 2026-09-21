# Arquitetura — Oficina ERP

**Status:** aprovado no Épico 0 (BAC-35). Fonte de verdade para Backend, Frontend e SRE.
**Última revisão:** 2026-09-21

Decisões pontuais e seus trade-offs ficam em [`adr/`](./adr/). Este documento é o
mapa; os ADRs são o porquê.

---

## 1. Visão geral

```
┌──────────────┐        HTTPS/JSON         ┌───────────────┐      TCP      ┌──────────────┐
│  Next.js     │ ────────────────────────► │   NestJS      │ ────────────► │  PostgreSQL  │
│  (frontend)  │ ◄──────────────────────── │   (backend)   │ ◄──────────── │      16      │
│  App Router  │     JWT no Authorization  │  REST+OpenAPI │     Prisma    │              │
└──────────────┘                           └───────────────┘               └──────────────┘
        │                                          │
        └──── gerado do OpenAPI: tipos + client ───┘
```

Três contêineres em `docker-compose.yml`: `db`, `backend`, `frontend`.
Sem message broker, sem cache distribuído, sem microsserviços — uma oficina
tem dezenas de OS por dia, não milhares por segundo. Ver [ADR-0002](./adr/0002-stack.md).

---

## 2. Stack

| Camada | Escolha | Versão alvo |
|---|---|---|
| Backend | NestJS + TypeScript | Nest 10, TS 5.x |
| ORM | Prisma | 5.x |
| Banco | PostgreSQL | 16 |
| API | REST + Swagger/OpenAPI 3 | gerado por decorators |
| Auth | JWT (access + refresh), Argon2id | |
| Frontend | Next.js App Router + TypeScript | Next 14+ |
| Estilo | Tailwind CSS + design system próprio | |
| Testes backend | Jest (unit + integração) + Supertest (API) | |
| Testes frontend | Vitest + Testing Library | |
| E2E | Playwright | ver [ADR-0005](./adr/0005-e2e-playwright.md) |
| CI | GitHub Actions | |

---

## 3. Camadas do backend

```
src/
  modules/<dominio>/
    <dominio>.controller.ts    HTTP: rota, DTO, Swagger, guard. Sem regra de negócio.
    <dominio>.service.ts       Regra de negócio. Sem objeto HTTP (Request/Response).
    dto/                       class-validator + @ApiProperty
    entities/                  tipos de saída
  common/
    guards/                    JwtAuthGuard, PermissionsGuard
    interceptors/              AuditInterceptor, TransformInterceptor
    filters/                   HttpExceptionFilter (formato de erro único)
    prisma/                    PrismaService
```

Regras não-negociáveis:

1. **Controller não calcula.** Todo valor monetário é calculado no service.
   A referência calculava totais no navegador e persistia o que chegasse — o
   Oficina ERP recalcula sempre no servidor e ignora total vindo do cliente
   (achado 8 da [análise](./REFERENCE_ANALYSIS.md)).
2. **Sem SQL cru** exceto em relatório agregado, e ali com `Prisma.sql` parametrizado.
3. **Transação obrigatória** onde a escrita cruza tabelas (OS + itens + movimento
   de estoque). `prisma.$transaction`.
4. **DTO valida na borda.** `ValidationPipe` com `whitelist: true` e
   `forbidNonWhitelisted: true` — campo não declarado é rejeitado, não ignorado.

---

## 4. Modelo de dados

Corrige as 15 lacunas mapeadas na [análise da referência](./REFERENCE_ANALYSIS.md#9-lacunas-da-referência-vs-escopo-do-oficina-erp).
Schema Prisma canônico: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

### 4.1 Entidades

| Entidade | Papel | Vem da referência? |
|---|---|---|
| `User` | usuário do sistema | `cms_users`, redesenhado |
| `Role` | perfil (ADMIN/GERENTE/MECANICO/ATENDENTE) | enum, não tabela |
| `Customer` | cliente (PF ou PJ) | `clients` |
| `Vehicle` | veículo, pertence a um cliente | `vehicles` |
| `Service` | catálogo de serviços **com preço e tempo estimado** | `services` + lacuna 3 |
| `ServiceCategory` | categoria de serviço | novo |
| `Product` | peça/produto **com custo, venda e estoque** | `products` + lacunas 4, 5 |
| `ProductCategory` | categoria de produto (tabela, não enum) | lacuna 15 |
| `Supplier` | fornecedor | `providers` |
| `StockMovement` | entrada/saída/ajuste/consumo/devolução | lacuna 4 |
| `Mechanic` | mecânico (vinculado a `User` quando faz login) | lacuna 6 |
| `ServiceOrder` | OS — **referencia cliente E veículo** | `orders` + lacuna 1 |
| `ServiceOrderService` | serviços da OS (N por OS) | lacuna 2 |
| `ServiceOrderItem` | peças da OS | `orders_details` |
| `Quote` / `QuoteItem` | orçamento e aprovação | lacuna 7 |
| `AuditLog` | quem mudou o quê, valor antes/depois | lacuna 10 |

### 4.2 Decisões de schema

- **PK `uuid`**, não `serial`. ID sequencial de cliente vaza volume de negócio e
  permite enumeração via API.
- **Número de OS separado da PK**: `ServiceOrder.number` (int, autoincremento via
  sequence) é o que a oficina lê e fala ao telefone; `id` é interno.
- **Dinheiro em `Decimal(12,2)`**, nunca `Float`. Ver [ADR-0004](./adr/0004-dinheiro-decimal.md).
- **Preços congelados no item**: `ServiceOrderItem.unitPrice` e
  `ServiceOrderService.unitPrice` copiam o preço vigente na inclusão. Reajustar o
  catálogo não reescreve OS antiga. A referência já fazia isso e estava certa.
- **Soft delete** (`deletedAt`) em cadastros; movimento de estoque e log de
  auditoria **nunca** são apagados.
- **Unicidade no banco, não só no formulário**: `Customer.document`,
  `Vehicle.plate`, `Product.sku`, `User.email` têm `@unique` no schema — a
  referência validava só no form e aceitava duplicata por qualquer outra via
  (lacuna 14).
- **Enums no banco** para `ServiceOrderStatus`, `QuoteStatus`, `PaymentMethod`,
  `StockMovementType`, `Role`, `FuelType` — string livre permite qualquer valor.

### 4.3 Máquina de estados da OS (lacuna 9)

```
      ABERTA ──► EM_ANDAMENTO ──► AGUARDANDO_PECA ──┐
         │             │                            │
         │             │◄───────────────────────────┘
         │             ▼
         │         FINALIZADA ──► ENTREGUE
         │             │
         └────► CANCELADA ◄───────┘
```

Transições permitidas (tabela única no service, testada):

| De | Para |
|---|---|
| `ABERTA` | `EM_ANDAMENTO`, `CANCELADA` |
| `EM_ANDAMENTO` | `AGUARDANDO_PECA`, `FINALIZADA`, `CANCELADA` |
| `AGUARDANDO_PECA` | `EM_ANDAMENTO`, `CANCELADA` |
| `FINALIZADA` | `ENTREGUE`, `CANCELADA` |
| `ENTREGUE` | — (terminal) |
| `CANCELADA` | — (terminal) |

Efeitos colaterais: entrar em `FINALIZADA` baixa estoque das peças (`CONSUMO`);
`CANCELADA` a partir de `FINALIZADA` devolve (`DEVOLUCAO`). Tudo na mesma transação.

### 4.4 Totais da OS

Calculados **no service**, a cada escrita, nunca aceitos do cliente:

```
servicesTotal = Σ (serviço.unitPrice × quantidade)
itemsTotal    = Σ (peça.unitPrice   × quantidade)
subtotal      = servicesTotal + itemsTotal
total         = subtotal − discount
```

`discount` é o único campo que o usuário informa, limitado por permissão
(`serviceorder:discount`).

---

## 5. Autenticação e autorização

- **Login**: e-mail + senha. Hash **Argon2id**.
- **Token**: JWT access (15 min) + refresh (7 dias, rotacionado, revogável).
  Ver [ADR-0003](./adr/0003-auth-jwt.md).
- **RBAC por permissão nomeada**, não por tabela. A referência dava
  `is_create/is_read/is_edit/is_delete` por módulo e não conseguia expressar
  "pode fechar OS mas não pode dar desconto" (lacuna 11). Aqui a permissão é
  `<recurso>:<ação>` — `serviceorder:close`, `serviceorder:discount`,
  `stock:adjust`, `report:financial`.
- Mapa perfil → permissões vive em código versionado (`common/rbac/permissions.ts`),
  não em linha de banco editável: mudança de permissão passa por PR e review.

| Perfil | Escopo |
|---|---|
| `ADMIN` | tudo, inclusive usuários e configuração |
| `GERENTE` | operação completa + relatórios financeiros + desconto; não gerencia usuários |
| `ATENDENTE` | clientes, veículos, orçamentos, abertura de OS; sem custo nem desconto |
| `MECANICO` | vê e atualiza as OS atribuídas a si; registra consumo de peça; sem valores |

O **primeiro admin é criado pelo seed**, com senha vinda de variável de ambiente
obrigatória (`SEED_ADMIN_PASSWORD`). Nenhuma senha padrão no código —
banco vazio → `docker compose up` → login funciona, sem passo manual.
Ver [ADR-0006](./adr/0006-bootstrap-do-admin.md).

---

## 6. Contrato de API

- Prefixo `/api/v1`. Swagger em `/api/docs`; OpenAPI JSON em `/api/docs-json`.
- O **OpenAPI é o contrato entre Backend e Frontend**. Mudança que quebra contrato
  exige aviso no PR e ajuste combinado — Backend não altera resposta sem o Frontend saber.
- Esqueleto inicial (a ser preenchido pelos épicos de cada módulo):
  [`docs/API.md`](./API.md).

Padrões:

| Assunto | Regra |
|---|---|
| Listagem | `GET /recurso?page=1&pageSize=20&q=&sort=campo:asc` |
| Envelope de lista | `{ data: [...], meta: { page, pageSize, total, totalPages } }` |
| Criação | `201` + corpo do recurso |
| Atualização parcial | `PATCH`, não `PUT` |
| Exclusão | `204`, soft delete |
| Erro | `{ statusCode, error, message, details? }` — `message` sempre legível em pt-BR |
| Erro externo | repassado verbatim em `details`, nunca resumido |
| Data/hora | ISO-8601 UTC; a formatação é do frontend |
| Dinheiro | string decimal (`"1234.50"`), nunca float JSON |

---

## 7. Frontend

```
src/
  app/                rotas (App Router), layouts, globals.css (tokens)
  components/         design system: Button, Input, Card, Table, Badge, EmptyState…
  features/<dominio>/ telas e hooks do domínio
  lib/api/            cliente HTTP tipado, gerado do OpenAPI
```

Regras (aplicadas em toda issue que toca `.tsx`):

- **Token, nunca cor literal.** Nada de `text-gray-500`, `bg-white`, `#aabbcc`.
  Cor se define uma vez em `globals.css`.
- **Sem elemento cru.** `<button>`, `<input>`, `<table>` sem componente é entrega incompleta.
- **Estado vazio, carregando e erro** fazem parte da tela, não são extras.
- **Mobile é requisito**: a OS precisa ser usável no celular, com o polegar, no balcão.
- **Acessibilidade mínima**: label associada, foco visível, contraste legível, toque ≥ 44px.
- Escala de espaçamento 4px do Tailwind, sem valor avulso.

Verificação, obrigatória em card de tela:

```bash
grep -rnE "text-gray-[0-9]|bg-(black|white)|#[0-9a-fA-F]{6}" src/app src/components \
  | grep -v globals.css     # → vazio
```

---

## 8. Infraestrutura

- `docker-compose.yml`: `db` (postgres:16-alpine, volume nomeado, healthcheck
  `pg_isready`), `backend` (espera db saudável, roda `prisma migrate deploy` +
  seed no start), `frontend`.
- **Subida do zero**: banco vazio → `docker compose up` → sistema usável, sem
  passo manual. É critério de aceite do Épico 1, não aspiração.
- `.env.example` documenta toda variável. Segredo real só em GitHub Secrets,
  referenciado como `${{ secrets.NOME }}`. Nenhuma credencial em repo, issue ou log.
- CI (GitHub Actions): lint → typecheck → testes backend (com Postgres de serviço)
  → testes frontend → build das imagens.

---

## 9. Git

- Branch por tarefa: `feature/<modulo>`, `fix/<assunto>`.
- Nunca commit direto na branch principal.
- PR por tarefa, revisado pelo Reviewer.
- Contratos (`schema.prisma`, OpenAPI) são compartilhados: alteração se anuncia
  no PR, com os afetados marcados.

---

## 10. Fora do escopo do MVP

Registrado para não voltar como surpresa: NF-e e obrigações fiscais, multi-oficina
(multi-tenant), agendamento com calendário, portal do cliente, integração com
WhatsApp, app nativo, BI. Nenhum deles aparece no briefing do BAC-33 — entram
por demanda explícita, com épico próprio.

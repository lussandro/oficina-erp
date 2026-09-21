# Contrato de API — Oficina ERP

Contrato entre Backend e Frontend. A **fonte de verdade executável** é o OpenAPI
gerado pelo NestJS em `/api/docs-json`; este documento fixa os padrões que todo
módulo segue e a superfície acordada no Épico 0.

Mudança que quebra contrato se anuncia no PR, com Backend e Frontend marcados.

Base: `/api/v1` · Autenticação: `Authorization: Bearer <access_token>`

---

## 1. Padrões

### Listagem

```
GET /recurso?page=1&pageSize=20&q=texto&sort=createdAt:desc
```

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
}
```

`pageSize` máximo 100. `q` busca nos campos textuais relevantes do recurso.

### Métodos

| Ação | Método | Resposta |
|---|---|---|
| Criar | `POST /recurso` | `201` + recurso |
| Ler | `GET /recurso/:id` | `200` |
| Atualizar | `PATCH /recurso/:id` | `200` + recurso |
| Excluir | `DELETE /recurso/:id` | `204`, soft delete |

`PATCH`, não `PUT`: atualização parcial é a regra.

### Erro

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "CPF já cadastrado para outro cliente",
  "details": { "field": "document" }
}
```

- `message` sempre legível, em pt-BR.
- Erro de sistema externo entra em `details` **verbatim**, inclusive código HTTP
  e corpo originais. Nunca resumido em "falha na operação".

| Código | Quando |
|---|---|
| `400` | payload malformado |
| `401` | sem token ou token expirado |
| `403` | autenticado, sem a permissão necessária |
| `404` | recurso inexistente |
| `409` | conflito de estado (ex.: transição de status inválida) |
| `422` | validação de negócio (ex.: documento duplicado) |

### Tipos

| Tipo | Formato |
|---|---|
| Dinheiro | string decimal — `"1234.50"`. Nunca float (ADR-0004) |
| Data/hora | ISO-8601 UTC — `"2026-09-21T14:30:00.000Z"` |
| ID | UUID v4 |
| Documento | somente dígitos, sem máscara |
| Placa | maiúsculas, sem hífen |

---

## 2. Superfície por módulo

Cada épico detalha os seus DTOs; aqui ficam as rotas acordadas e a permissão exigida.

### Autenticação — Épico 2

| Rota | Permissão |
|---|---|
| `POST /auth/login` | pública |
| `POST /auth/refresh` | pública (refresh token válido) |
| `POST /auth/logout` | autenticado |
| `GET /auth/me` | autenticado |
| `PATCH /auth/me` | autenticado (name, phone) |
| `POST /auth/change-password` | autenticado |
| `POST /auth/forgot-password` | pública |
| `POST /auth/reset-password` | pública (token válido) |

Access token: JWT, 15 min. Refresh token: opaco, 7 dias, rotativo (cada uso invalida o
anterior e emite um novo), hash SHA-256 em repouso. RBAC por permissão nomeada
`<recurso>:<ação>`, mapa perfil→permissões versionado em código
(`backend/src/common/rbac/permissions.ts`), não em tabela — ver ADR-0003.

**`POST /auth/login`** — `{ email, password }` (`email` formato e-mail; `password`
string não vazia).

```json
// 201 — execução real (token truncado para exibição)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...VG5KFQMnlLNE5VQRqD-AK10RHNGXaUW8dFZjGkSncUs",
  "refreshToken": "ee06abbaa264d60c0940c18a7caab8cc68cb772155d4e49409705a83460d5619663e4f2e5482e25e859d5f777d5c5f2e",
  "user": {
    "id": "8a979b25-1647-409a-9af1-51adb7ce7754",
    "name": "Administrador",
    "email": "admin@oficina.local",
    "role": "ADMIN",
    "permissions": ["user:read", "user:create", "user:update", "user:manage"]
  }
}
```

Efeito colateral: grava `lastLoginAt`. Falha (usuário inexistente, inativo ou senha
errada) → sempre `401 Credenciais inválidas`, mesma mensagem nos três casos — não
revela se o e-mail existe.

**`POST /auth/refresh`** — `{ refreshToken }`. Rotação: o token enviado é revogado e um
novo par é emitido na mesma transação — reusar o token antigo (ou um já revogado por
`logout`/`change-password`/`reset-password`) → `401 Refresh token inválido ou expirado`.

**`POST /auth/logout`** — `{ refreshToken }` → `204`. Revoga o token informado; chamar
de novo com o mesmo token continua `204` (idempotente, não verifica se já estava revogado).

**`GET /auth/me`** → dados do usuário (`id, name, email, role, phone, active,
lastLoginAt, createdAt, updatedAt`) + `permissions[]` calculado a partir do `role`.

**`PATCH /auth/me`** — `{ name?, phone? }`, ambos opcionais. Não altera `email` nem
`role` — isso é só via `PATCH /users/:id`, por quem tem `user:update`.

**`POST /auth/change-password`** — `{ currentPassword, newPassword }` (`newPassword`
mín. 8 caracteres) → `204`. Senha atual errada → `401 Senha atual incorreta`. Efeito
colateral: revoga **todos** os refresh tokens ativos do usuário — sessões em outros
dispositivos são derrubadas.

**`POST /auth/forgot-password`** — `{ email }` → sempre `204`, exista ou não o e-mail
(não revela). Gera e persiste token de reset (1h de validade) mas **não envia e-mail**:
nenhum provedor/secret de envio foi decidido em ADR até o momento. Fora de escopo do
Épico 2; retomar quando houver ADR + secret configurado. Em `NODE_ENV !== production` o
token bruto vai em log `DEBUG` — único jeito de exercitar o fluxo hoje, manualmente ou
em teste.

**`POST /auth/reset-password`** — `{ token, newPassword }` (`newPassword` mín. 8) →
`204`. Token inválido, expirado ou já usado → `401 Token de recuperação inválido ou
expirado`. Efeito colateral: troca a senha e revoga todos os refresh tokens ativos do
usuário, igual a `change-password`.

**Quirk real deste módulo** — rotas protegidas sem token (guard do Passport, antes de
chegar em qualquer controller) lançam uma `UnauthorizedException` que não popula
`error`; o filtro global cai no default. `statusCode` continua correto, só `error` que
não é `"Unauthorized"`. Execução real, `GET /users` sem `Authorization`:

```json
{ "statusCode": 401, "error": "Internal Server Error", "message": "Unauthorized" }
```

Trate por `statusCode`, não por `error`, nesse caminho específico.

### Cadastros

| Recurso | Rotas | Épico |
|---|---|---|
| `/users` | CRUD (permissões `user:read`\|`create`\|`update`\|`manage`; sem rota própria de ativar/inativar — usa `PATCH /users/:id` com `active`) | 2 |
| `/customers` | CRUD + `GET /:id/vehicles` + `GET /:id/service-orders` | 3 |
| `/vehicles` | CRUD + `GET /:id/history` | 4, 12 |
| `/services` · `/service-categories` | CRUD (permissões `service:read`\|`create`\|`update`\|`manage`; `DELETE /service-categories/:id` é hard delete — serviços vinculados ficam sem categoria via `onDelete: SetNull`, `DELETE /services/:id` é soft delete) | 5 |
| `/products` · `/product-categories` | CRUD | 6 |
| `/suppliers` | CRUD | 7 |
| `/mechanics` | CRUD | 9 |

`GET /customers?q=` busca por nome, documento e telefone.
`GET /vehicles?q=` busca por placa, marca e modelo.
`GET /services?q=&categoryId=&active=` busca por nome/descrição e filtra por categoria e status.

#### Usuários — Épico 2

`POST /users` — `{ name, email, password, role, phone? }`. `role ∈ { ADMIN, GERENTE,
ATENDENTE, MECANICO }`; `password` mín. 8 caracteres. Payload malformado (e-mail
inválido, senha curta, `role` fora do enum) → `400`, mensagens concatenadas por `; `.
Execução real, `POST /users` com `email` inválido + `password` curta + sem `role`:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "email must be an email; password must be longer than or equal to 8 characters; role must be one of the following values: ADMIN, GERENTE, ATENDENTE, MECANICO"
}
```

E-mail duplicado (comparação case-insensitive, salvo em minúsculas) → `422`:

```json
{
  "statusCode": 422,
  "error": "Internal Server Error",
  "message": "E-mail já cadastrado para outro usuário",
  "details": { "field": "email" }
}
```

Mesma pegadinha do `401` de auth: `UnprocessableEntityException` construída com objeto
(`{ message, details }`) não popula `error` — o filtro cai no default. `statusCode`
(`422`) é o campo confiável, não `error`.

`GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` com id inexistente → `404
Usuário não encontrado`.

`PATCH /users/:id` — `{ name?, email?, role?, phone?, active? }`, todos opcionais.
`active: false` é como inativar (não há rota própria) — `AuthService.login` recusa
login de usuário inativo, mas não revoga refresh tokens já emitidos.

`DELETE /users/:id` → `204`. Soft delete: seta `deletedAt` + `active: false`; some de
`GET /users` e `GET /users/:id` (`404` depois), mas a linha continua no banco.

Listagem `GET /users?page=&pageSize=&q=&role=&active=`: `q` busca em `name` e `email`
(case-insensitive). `role` filtra por enum exato. `active` é boolean — regressão real
achada na revisão do PR #5 (BAC-68): `?active=false` virava `true` porque
`@Type(() => Boolean)` do class-transformer faz `Boolean("false") === true` (qualquer
string não vazia é truthy); corrigido com `@Transform` explícito em `ListUsersQuery`
(coberto por `list-users.query.spec.ts`).

### Estoque — Épico 8

| Rota | Permissão |
|---|---|
| `GET /stock/movements` | `stock:read` |
| `POST /stock/movements` | `stock:write` (entrada/saída) |
| `POST /stock/adjustments` | `stock:adjust` |
| `GET /stock/low` | `stock:read` — abaixo do mínimo |

Movimento é append-only: não há `PATCH` nem `DELETE`. Correção é `AJUSTE`.

### Ordens de serviço — Épico 10

| Rota | Permissão |
|---|---|
| `GET /service-orders` | `serviceorder:read` |
| `POST /service-orders` | `serviceorder:create` |
| `GET /service-orders/:id` | `serviceorder:read` |
| `PATCH /service-orders/:id` | `serviceorder:update` |
| `PATCH /service-orders/:id/status` | `serviceorder:update` / `:close` |
| `POST /service-orders/:id/services` | `serviceorder:update` |
| `DELETE /service-orders/:id/services/:itemId` | `serviceorder:update` |
| `POST /service-orders/:id/items` | `serviceorder:update` |
| `DELETE /service-orders/:id/items/:itemId` | `serviceorder:update` |
| `PATCH /service-orders/:id/discount` | `serviceorder:discount` |

Filtros: `status`, `customerId`, `vehicleId`, `mechanicId`, `from`, `to`.

**Totais são sempre calculados no servidor.** `servicesTotal`, `itemsTotal` e
`total` enviados pelo cliente são ignorados — só `discount` é aceito, e com permissão.

`PATCH /service-orders/:id/status` valida a transição contra a máquina de estados
(ARCHITECTURE §4.3). Transição inválida → `409` com as transições permitidas em `details`.

### Orçamentos — Épico 11

| Rota | Permissão |
|---|---|
| `GET` · `POST` · `PATCH` `/quotes` | `quote:read` / `quote:create` / `quote:update` |
| `POST /quotes/:id/send` | `quote:update` |
| `POST /quotes/:id/approve` | `quote:approve` |
| `POST /quotes/:id/reject` | `quote:approve` |
| `POST /quotes/:id/convert` | `serviceorder:create` — gera a OS |
| `GET /quotes/:id/pdf` | `quote:read` — `application/pdf` |

### Dashboard e busca — Épicos 13, 14

| Rota | Retorna |
|---|---|
| `GET /dashboard/summary` | OS por status, faturamento do mês, peças abaixo do mínimo, OS do dia |
| `GET /search?q=` | resultado unificado: cliente, veículo (placa), OS (número), produto |

### Relatórios — Épico 15

`GET /reports/<tipo>?from=&to=&format=json|csv|xlsx|pdf`, com
`tipo ∈ { service-orders, revenue, services, products, customers, vehicles, stock, productivity }`.
Permissão `report:read`; os financeiros exigem `report:financial`.

### Auditoria — Épico 16

`GET /audit-logs?entity=&entityId=&userId=&action=&from=&to=` — permissão `audit:read` (ADMIN).
Somente leitura: não há rota de escrita nem de exclusão.

---

## 3. Saúde

`GET /health` (fora do prefixo `/api/v1`, sem autenticação) → `{ "status": "ok" }`
(execução real — o handler não checa o banco, não confundir com `db: "up"`). É o
healthcheck do Compose e do CI.

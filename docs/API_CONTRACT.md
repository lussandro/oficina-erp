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
| `POST /auth/forgot-password` | pública |
| `POST /auth/reset-password` | pública (token válido) |

`POST /auth/login` → `{ accessToken, refreshToken, user: { id, name, email, role, permissions[] } }`

### Cadastros

| Recurso | Rotas | Épico |
|---|---|---|
| `/users` | CRUD | 2 |
| `/customers` | CRUD + `GET /:id/vehicles` + `GET /:id/service-orders` | 3 |
| `/vehicles` | CRUD + `GET /:id/history` | 4, 12 |
| `/services` · `/service-categories` | CRUD | 5 |
| `/products` · `/product-categories` | CRUD | 6 |
| `/suppliers` | CRUD | 7 |
| `/mechanics` | CRUD | 9 |

`GET /customers?q=` busca por nome, documento e telefone.
`GET /vehicles?q=` busca por placa, marca e modelo.

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

`GET /health` (fora do prefixo `/api/v1`, sem autenticação) →
`{ "status": "ok", "db": "up" }`. É o healthcheck do Compose e do CI.

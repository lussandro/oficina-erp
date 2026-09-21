# Banco de dados — Oficina ERP

PostgreSQL 16. Schema canônico e executável:
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). **Este
documento descreve o schema; ele não o substitui.** Divergência entre os dois é
bug deste arquivo — o Prisma é a fonte de verdade.

Racional das decisões: [ARCHITECTURE §4](./ARCHITECTURE.md#4-modelo-de-dados) e
[`adr/`](./adr/).

**Última revisão:** 2026-09-21 · schema do Épico 0 (BAC-35), validado no CI.

---

## 1. Como conferir que este documento está correto

```bash
npx --yes prisma@5 validate --schema backend/prisma/schema.prisma
# -> The schema at backend/prisma/schema.prisma is valid 🚀
```

O mesmo comando roda no job `foundation` do CI a cada PR
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)), com
`DATABASE_URL` sintético — `validate` não conecta ao banco.

Para listar as tabelas reais depois de aplicar as migrations:

```bash
docker compose exec db psql -U oficina -d oficina_erp -c '\dt'
```

---

## 2. Convenções

| Assunto | Regra | Por quê |
|---|---|---|
| Nome de tabela | `snake_case` plural, via `@@map` | SQL idiomático; o model fica em PascalCase no código |
| PK | `uuid` (`@default(uuid())`) | ID sequencial vaza volume de negócio e permite enumeração via API |
| Número de negócio | `Int @unique @default(autoincrement())` separado da PK | `ServiceOrder.number` e `Quote.number` são o que a oficina fala ao telefone |
| Dinheiro | `Decimal @db.Decimal(12,2)` | nunca `Float` — [ADR-0004](./adr/0004-dinheiro-decimal.md) |
| Documento (CPF/CNPJ) | `String @unique`, somente dígitos | unicidade no banco, não só no formulário |
| Placa | `String @unique`, maiúsculas sem hífen | idem |
| Exclusão | `deletedAt DateTime?` (soft delete) em cadastros | histórico de OS não pode perder o cliente que o originou |
| Carimbos | `createdAt` / `updatedAt` em toda entidade mutável | |
| Enum | tipo enum no Postgres | string livre aceita qualquer valor |

**Nunca recebem soft delete nem `DELETE`:** `StockMovement` e `AuditLog`. São
append-only por definição — correção de estoque é um movimento `AJUSTE`, não um
`UPDATE`.

---

## 3. Enums

| Enum | Valores |
|---|---|
| `Role` | `ADMIN`, `GERENTE`, `ATENDENTE`, `MECANICO` |
| `PersonType` | `PF`, `PJ` |
| `FuelType` | `GASOLINA`, `ETANOL`, `FLEX`, `DIESEL`, `GNV`, `ELETRICO`, `HIBRIDO` |
| `ServiceOrderStatus` | `ABERTA`, `EM_ANDAMENTO`, `AGUARDANDO_PECA`, `FINALIZADA`, `ENTREGUE`, `CANCELADA` |
| `QuoteStatus` | `RASCUNHO`, `ENVIADO`, `APROVADO`, `REJEITADO`, `EXPIRADO`, `CONVERTIDO` |
| `PaymentMethod` | `DINHEIRO`, `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `BOLETO`, `TRANSFERENCIA` |
| `StockMovementType` | `ENTRADA`, `SAIDA`, `AJUSTE`, `CONSUMO`, `DEVOLUCAO` |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `LOGIN`, `LOGOUT` |

Incluir valor em enum é migration. Enum com valor em uso não perde valor sem
plano de migração de dados.

---

## 4. Mapa das tabelas

```
users ──┬── refresh_tokens
        ├── audit_logs
        └── mechanics (1:0..1, quando o mecânico também loga)

customers ──┬── vehicles ──┬── service_orders ──┬── service_order_services ── services
            │              │                    ├── service_order_items ───── products
            │              │                    └── stock_movements
            │              └── quotes ───────────── quote_items ──┬── services
            │                                                     └── products
            └── (service_orders, quotes)

service_categories ── services
product_categories ── products
suppliers ──┬── products
            └── stock_movements
```

`Quote 1:0..1 ServiceOrder` — a OS guarda `quoteId @unique`: um orçamento vira no
máximo uma OS, e a OS sabe de onde veio.

---

## 5. Tabelas

### 5.1 Acesso e auditoria

**`users`** — usuário do sistema.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `email` | text `@unique` | login |
| `passwordHash` | text | Argon2id — [ADR-0003](./adr/0003-auth-jwt.md) |
| `role` | `Role` default `ATENDENTE` | perfil, indexado |
| `phone` | text? | |
| `active` | bool default `true` | desativar ≠ apagar |
| `lastLoginAt` | timestamp? | |
| `createdAt` / `updatedAt` / `deletedAt` | timestamp | soft delete |

**`refresh_tokens`** — sessão renovável. Guarda `tokenHash @unique`, **não** o
token: vazamento da tabela não dá sessão a ninguém. `revokedAt` marca rotação e
logout; `onDelete: Cascade` a partir de `users`.

**`audit_logs`** — quem mudou o quê, com `before`/`after` em `Json?`. Nunca é
apagada; `userId` usa `onDelete: SetNull` para que remover um usuário não apague
o rastro do que ele fez. Índices: `(entity, entityId)`, `userId`, `createdAt`.

### 5.2 Clientes e veículos

**`customers`** — PF ou PJ (`personType`). `document` (CPF/CNPJ, só dígitos) é
`@unique`. Endereço completo opcional, `state` em `Char(2)`. Índices em `name` e
`phone` — é por aí que o balcão procura.

**`vehicles`** — `plate @unique` (padrão antigo e Mercosul), `vin @unique` quando
informado, `currentKm`, `fuelType`. Pertence a um `customerId`. Índices:
`customerId`, `(brand, model)`.

### 5.3 Catálogos

| Tabela | Destaques |
|---|---|
| `service_categories` | `name @unique` |
| `services` | `price Decimal(12,2)` e `estimatedTime` em minutos — a referência não tinha nenhum dos dois |
| `product_categories` | categoria em tabela, não enum: mudar não exige deploy |
| `suppliers` | `document` (CNPJ) `@unique`, endereço, `active` |
| `products` | `sku @unique`, `barcode @unique?`, `costPrice`, `salePrice`, `unit`, `stockQty`, `minStockQty` |

**`stock_movements`** — rastreabilidade do estoque, append-only.

| Coluna | Nota |
|---|---|
| `type` | `StockMovementType` |
| `quantity` | int |
| `unitCost` | `Decimal(12,2)?` |
| `resultingQty` | saldo **após** o movimento — auditoria sem recalcular a série inteira |
| `reason`, `documentRef` | origem do movimento |
| `productId` | obrigatório |
| `supplierId`, `serviceOrderId` | opcionais, `SetNull` |

`products.stockQty` é derivado desta série. Divergência entre os dois é bug
detectável — e é exatamente por isso que `resultingQty` existe.

### 5.4 Equipe

**`mechanics`** — `document @unique?`, `specialty`, `hiredAt`. `userId @unique?`
liga ao `users` quando o mecânico também acessa o sistema; mecânico que não loga
existe do mesmo jeito.

### 5.5 Orçamento

**`quotes`** — `number @unique` autoincremento visível ao cliente, `status`,
cliente + veículo obrigatórios, `validUntil`, `approvedAt` / `rejectedAt` /
`rejectionReason`. Totais (`servicesTotal`, `itemsTotal`, `discount`, `total`)
são **calculados no servidor**; valor vindo do cliente é ignorado.

**`quote_items`** — linha de serviço **ou** de produto. A regra "exatamente um
dos dois" é validada no service: Prisma não expressa `CHECK` constraint no
schema. `onDelete: Cascade` a partir do orçamento.

### 5.6 Ordem de serviço

**`service_orders`** — núcleo do sistema. Referencia **cliente e veículo**
(lacuna 1 da referência, onde a ordem só conhecia o cliente e o histórico por
veículo era impossível).

| Grupo | Colunas |
|---|---|
| Identificação | `id` uuid, `number` int `@unique` |
| Vínculos | `customerId`, `vehicleId`, `mechanicId?`, `quoteId @unique?` |
| Operação | `entryKm`, `complaint`, `diagnosis`, `notes` |
| Datas | `entryAt`, `expectedAt`, `finishedAt`, `deliveredAt`, `cancelledAt` |
| Cancelamento | `cancelReason` |
| Pagamento | `paymentMethod?`, `paidAt?` |
| Totais | `servicesTotal`, `itemsTotal`, `discount`, `total` — todos `Decimal(12,2)`, calculados no servidor |

Índices: `customerId`, `vehicleId`, `mechanicId`, `status`, `entryAt`.

**`service_order_services`** — N serviços por OS (a referência aceitava
exatamente um). `mechanicId?` permite executor diferente do responsável pela OS.
`unitPrice` congela o preço na inclusão: reajustar o catálogo não reescreve OS
antiga.

**`service_order_items`** — peças da OS, com `unitPrice` congelado pelo mesmo
motivo. A baixa de estoque acontece na transição para `FINALIZADA`, dentro da
mesma transação que muda o status.

---

## 6. Invariantes

Regras que o schema sozinho não garante e que vivem em service + teste:

1. `service_orders.total = servicesTotal + itemsTotal − discount`, recalculado a
   cada escrita. Total enviado pelo cliente é descartado.
2. `quote_items` e as linhas de OS têm **ou** `serviceId` **ou** `productId`,
   nunca ambos, nunca nenhum.
3. `products.stockQty` = último `resultingQty` da série de movimentos daquele
   produto.
4. Transição de status da OS segue a tabela de
   [ARCHITECTURE §4.3](./ARCHITECTURE.md#43-máquina-de-estados-da-os-lacuna-9).
   Transição fora dela é `409`, não silêncio.
5. Escrita que cruza tabelas (OS + itens + movimento de estoque) roda em
   `prisma.$transaction`.

---

## 7. Migrations

```bash
cd backend

npx prisma migrate dev --name <descricao>   # desenvolvimento: cria e aplica
npx prisma migrate deploy                    # CI e produção: só aplica o que existe
npx prisma migrate status                    # o que falta aplicar
npx prisma studio                            # inspeção visual
```

Regras:

- Migration entra no repositório junto com o PR que muda o schema. Schema
  alterado sem migration é PR incompleto.
- Em produção/CI **só** `migrate deploy`. `migrate dev` e `migrate reset` apagam
  dados.
- Alteração destrutiva (remover coluna, estreitar tipo) exige migration em duas
  etapas: primeiro escrever nos dois lugares, depois remover o antigo.
- `schema.prisma` é contrato compartilhado entre Backend e Frontend: mudança se
  anuncia no PR, com os afetados marcados.

---

## 8. Estado inicial

Banco vazio → `docker compose --profile app up` → migrations + seed → login
funciona. Sem passo manual, por
[ADR-0006](./adr/0006-bootstrap-do-admin.md).

O seed cria o administrador a partir de `SEED_ADMIN_EMAIL` e
`SEED_ADMIN_PASSWORD`. **Não há senha padrão no código**: variável ausente faz o
seed falhar dizendo qual falta, em vez de criar um usuário previsível.

O seed de demonstração (catálogo, clientes e OS de exemplo) é entrega do Épico 21
e é separado do bootstrap do admin.

---

## 9. Backup

`docker compose` guarda os dados no volume nomeado `pgdata`. `docker compose
down -v` **apaga o volume** — não é o comando para reiniciar a stack.

```bash
# dump
docker compose exec -T db pg_dump -U oficina -Fc oficina_erp > backup.dump

# restauração num banco vazio
docker compose exec -T db pg_restore -U oficina -d oficina_erp --clean < backup.dump
```

Política de retenção e destino do backup em produção: ver
[DEPLOYMENT.md §6](./DEPLOYMENT.md#6-backup-e-restauração).

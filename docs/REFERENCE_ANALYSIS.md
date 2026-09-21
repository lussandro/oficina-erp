# Análise do sistema de referência — bbroger/oficina-mecanica

**Fonte:** https://github.com/bbroger/oficina-mecanica
**Licença:** MIT — Copyright (c) 2019 Marcello Silvério
**Commit analisado:** clone `--depth 1` da branch padrão em 2026-09-21
**Método:** leitura direta do código (migrations, controllers, seeds, README), não do README isolado.

Este documento é **descritivo**, não prescritivo. Ele registra o que o sistema de
referência faz. O que o Oficina ERP vai fazer está em [ARCHITECTURE.md](./ARCHITECTURE.md)
e nos [ADRs](./adr/).

---

## 1. Stack observada

| Camada | Tecnologia |
|---|---|
| Linguagem | PHP >= 7.1.3 |
| Framework | Laravel 5.x |
| Admin/CRUD | **CRUDBooster** (gerador de CRUD sobre Laravel) |
| UI | AdminLTE 2, jQuery, jQuery Mask, AJAX, Blade |
| Banco | MySQL / PostgreSQL / SQL Server / SQLite (via PDO) |
| Auth/RBAC | Tabelas `cms_*` do CRUDBooster |

**Achado relevante:** o sistema não tem camada de domínio própria. Toda a lógica
vive em arquivos de configuração declarativa dentro dos controllers
(`$this->col[]`, `$this->form[]`), interpretados pelo CRUDBooster em runtime.
Não existem Models Eloquent para as entidades de negócio — apenas `app/User.php`
(padrão do Laravel, não usado pelo admin). Isso significa:

- Não há regras de negócio testáveis isoladamente.
- Não há serviços, repositórios nem eventos de domínio.
- Validação é string declarativa Laravel (`'required|cpf|unique:clients,cpf'`).
- Não há API REST: o frontend é server-rendered com AJAX para o próprio admin.

Consequência para o novo projeto: **não há código de domínio a reaproveitar.**
O valor da referência está no **modelo de dados e no vocabulário de negócio**,
não na implementação. Ver [ADR-0001](./adr/0001-nao-reaproveitar-codigo-da-referencia.md).

---

## 2. Entidades e tabelas

### 2.1 Tabelas de negócio (migrations `2019_11_23_*`)

#### `clients`
| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| id | increments | não | PK |
| name | string | não | |
| cpf | string | não | valida `cpf`, `unique` no form; **sem unique no schema** |
| phone | string | sim | validação `min:10\|max:11` (sem máscara no banco) |
| cep | string | sim | `size:8` |
| address | string | sim | |
| address_number | string | sim | |
| complement | string | sim | |
| city | string | sim | |
| state | string | sim | enum de 27 UFs no form, string livre no banco |
| deleted_at | softDeletes | sim | |
| created_at / updated_at | timestamps | | |

#### `vehicles`
| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| id | increments | não | PK |
| model | string | não | |
| brand | string | não | |
| plate | string | não | `alpha_num\|min:6\|max:20`; **sem unique** |
| year | char(4) | sim | faixa `ano-120` a `ano+3` |
| km_current | double | sim | |
| color | string | sim | enum de 14 cores no form |
| type_fuel | string | sim | `Diesel;Gasolina;Álcool;Etanol;Gás Natural;Elétrico` |
| clients_id | FK → clients.id | **não** | veículo sempre pertence a um cliente |
| deleted_at | softDeletes | sim | |

#### `services`
| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| id | increments | não | PK |
| name | string | não | `unique:services,name` no form |
| description | text | sim | |
| deleted_at | softDeletes | sim | |

**Achado:** `services` **não tem preço nem tempo estimado**. O preço do serviço é
digitado solto em `orders.price_services` a cada ordem. Não existe catálogo de
preços. Esta é uma lacuna funcional, não uma decisão.

#### `providers` (fornecedores)
Mesmo shape de `clients`, trocando `cpf` por `cnpj` e acrescentando `url_site`.

#### `products`
| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| id | increments | não | PK |
| category | string | sim | enum com ~70 valores hardcoded no controller |
| name | string | não | |
| price | decimal | sim | preço de venda; **não há preço de custo** |
| description | text | sim | WYSIWYG |
| barcode | string | sim | `unique:products,barcode` no form |
| photo | string | sim | upload, resize 120x120 |
| providers_id | FK → providers.id | sim | `onDelete('set null')` |
| deleted_at | softDeletes | sim | |

**Achado:** **não existe controle de estoque.** Nenhuma coluna de quantidade,
estoque mínimo ou movimentação. Vender um produto numa ordem não decrementa nada.

#### `orders` (ordem de serviço / pedido)
| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| id | increments | não | PK e também o "número da OS" exibido |
| payment | string | sim | `Cartão de Crédito;Boleto Bancário;Débito Automático;Dinheiro;Cheques` |
| situation | string | não | default `'Aberto'`; form oferece `Concretizado;Aberto;Cancelado` |
| observation | text | sim | |
| price_services | decimal | sim | preço do serviço, digitado manualmente |
| total_items | decimal | sim | soma dos subtotais dos itens |
| total | decimal | **não** | `price_services + total_items` |
| services_id | FK → services.id | sim | **apenas UM serviço por ordem** |
| clients_id | FK → clients.id | não | |
| deleted_at | softDeletes | sim | |

**Achados críticos:**
1. Uma OS aceita **um único serviço** (FK escalar, não tabela de junção).
2. A OS **não referencia o veículo**. Liga-se ao cliente, não ao carro. O histórico
   por veículo — requisito central de uma oficina — é impossível no modelo atual.
3. Não há mecânico responsável, data de entrada/saída prevista, nem KM na entrada.
4. `situation` é string livre no banco com 3 valores no form: não há máquina de estados.

#### `orders_details` (itens da OS)
| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| id | increments | não | PK |
| price | decimal | não | preço do produto **copiado** no momento da venda |
| amount | int unsigned | não | default 0 |
| subtotal | decimal | não | `amount * price`, calculado no front |
| products_id | FK → products.id | não | |
| orders_id | FK → orders.id | não | |
| (sem softDeletes) | | | |

Só carrega **produtos**. Serviços não entram como item de linha.

### 2.2 Tabelas de infraestrutura (CRUDBooster, `cms_*`)

`cms_users`, `cms_privileges`, `cms_privileges_roles`, `cms_moduls`, `cms_menus`,
`cms_menus_privileges`, `cms_logs`, `cms_settings`, `cms_email_queues`,
`cms_email_templates`, `cms_statistics`, `cms_statistic_components`.

Relevantes para o novo sistema:

- **`cms_users`**: `name, photo, email, cpf, phone, endereço…, password, id_cms_privileges`.
  Um usuário tem **exatamente um** perfil.
- **`cms_privileges`**: `name, is_superadmin`. Seed cria só `Super Administrator`.
- **`cms_privileges_roles`**: permissão por (perfil × módulo) com 5 flags booleanas:
  `is_visible, is_create, is_read, is_edit, is_delete`. É o modelo de RBAC inteiro.
- **`cms_logs`**: `ipaddress, useragent, url, description, id_cms_users`. É log de
  acesso, **não auditoria de dados** — não guarda valor antigo/novo nem entidade afetada.

---

## 3. Relacionamentos

```
clients 1──N vehicles
clients 1──N orders
providers 1──N products        (ON DELETE SET NULL)
services 1──N orders           (um serviço por ordem)
orders  1──N orders_details N──1 products
cms_privileges 1──N cms_users
cms_privileges N──N cms_moduls (via cms_privileges_roles, com flags CRUD)
```

**Lacuna estrutural:** `vehicles` e `orders` não se tocam.

---

## 4. Regras de negócio observadas

Todas declarativas, extraídas dos controllers:

| Regra | Onde | Aplicação |
|---|---|---|
| CPF válido e único em clientes | `AdminClientsController` | validação de form |
| CNPJ válido e único em fornecedores | `AdminProvidersController` | validação de form |
| Nome de serviço único | `AdminServicesController` | validação de form |
| Código de barras único | `AdminProductsController` | validação de form |
| Ano do veículo entre `hoje-120` e `hoje+3` | `AdminVehiclesController` | validação de form |
| `subtotal = amount * price` | form `child` da OS | **fórmula no JavaScript do front** |
| `total = price_services + total_items` | campo readonly | calculado no front |
| Situação default `Aberto` | migration | default do banco |
| Exclusão é lógica (soft delete) | migrations | exceto `orders_details` |

**Achado de segurança/integridade:** todos os totais são calculados no
**navegador** e persistidos como vieram. Um cliente HTTP arbitrário grava
`total = 0`. O backend não recalcula. Isso **não** deve ser reproduzido.

---

## 5. Telas

Geradas pelo CRUDBooster sobre AdminLTE 2. Por módulo (`clients`, `vehicles`,
`services`, `products`, `providers`, `orders`, `cms_users`):

- **Listagem**: tabela paginada (20/pág.), ordenação, busca, filtro avançado por coluna,
  botões Adicionar / Editar / Detalhe / Excluir / Exportar.
- **Formulário**: create/edit compartilham a mesma definição de campos.
- **Detalhe**: leitura do registro.
- **OS**: formulário com grid filha (`type => 'child'`) para itens, seleção de
  produto via modal (`datamodal`) e cálculo de subtotal no cliente.

Telas administrativas do CRUDBooster: gestão de menus, módulos, privilégios,
templates de e-mail, configurações, estatísticas, logs.

---

## 6. Relatórios

Não há módulo de relatório com lógica própria. O que existe é **exportação da
listagem** (`button_export = true`), oferecida pelo CRUDBooster em **PDF, CSV e
XLS**, com escolha de colunas e do filtro corrente. Não existem agregações,
faturamento por período, produtividade, curva ABC nem ranking.

---

## 7. Permissões

Modelo: **perfil → módulo → 5 flags CRUD**.

- Um perfil por usuário (`cms_users.id_cms_privileges`).
- `is_superadmin` ignora todas as checagens.
- Seed cria apenas `Super Administrator`; os perfis do briefing
  (Administrador/Gerente/Mecânico/Atendente) **não existem** na referência.
- Permissão é por **módulo (tabela)**, não por ação de negócio. Não é possível
  expressar "pode fechar OS mas não pode dar desconto".

---

## 8. Fluxo principal

```
cadastrar cliente → cadastrar veículo (ligado ao cliente)
        ↓
criar ordem: escolhe cliente → escolhe 1 serviço → digita preço do serviço
        ↓
adiciona produtos pelo modal (preço copiado, quantidade, subtotal no front)
        ↓
escolhe forma de pagamento → define situação (Aberto/Concretizado/Cancelado)
        ↓
salva. Fim.
```

Não há: orçamento prévio, aprovação do cliente, atribuição a mecânico, baixa de
estoque, histórico do veículo, notificação.

---

## 9. Lacunas da referência vs. escopo do Oficina ERP

Resumo do que **precisa ser projetado do zero** — insumo direto para os épicos 2–22:

| # | Lacuna | Impacto |
|---|---|---|
| 1 | OS não referencia veículo | histórico por veículo impossível |
| 2 | Um único serviço por OS | oficina real faz vários serviços por visita |
| 3 | `services` sem preço nem tempo estimado | não há catálogo, preço é digitado toda vez |
| 4 | Sem estoque | venda de peça não baixa nada |
| 5 | Sem preço de custo | margem não calculável |
| 6 | Sem mecânico/funcionário | produtividade impossível |
| 7 | Sem orçamento nem aprovação | falta etapa comercial inteira |
| 8 | Totais calculados no cliente | integridade financeira comprometida |
| 9 | `situation` sem máquina de estados | qualquer transição é válida |
| 10 | Sem auditoria de dados (só log de acesso) | requisito do Épico 16 não coberto |
| 11 | Perfis de negócio inexistentes | RBAC precisa ser desenhado |
| 12 | Relatórios = export de listagem | requisito do Épico 15 não coberto |
| 13 | Sem API | frontend desacoplado impossível |
| 14 | `plate` e `cpf` sem unique no schema | duplicata entra por qualquer via que não seja o form |
| 15 | Categoria de produto como enum hardcoded (~70 itens) | manutenção só por deploy |

---

## 10. Licenciamento

A referência é MIT (Copyright (c) 2019 Marcello Silvério). Conforme
[ADR-0001](./adr/0001-nao-reaproveitar-codigo-da-referencia.md), **nenhum trecho
de código será copiado** — o reaproveitamento é conceitual (vocabulário, modelo
de dados, escopo funcional), que não é objeto de copyright.

Ainda assim, o arquivo [`LICENSE`](../LICENSE) deste repositório mantém o aviso
de atribuição à referência na seção "Third-party notices", por transparência. Se
em algum momento um trecho vier a ser copiado, o aviso já está no lugar e a
condição da MIT permanece satisfeita.

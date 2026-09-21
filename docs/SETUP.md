# Setup — ambiente de desenvolvimento

Como sair de um clone vazio até o sistema rodando na sua máquina.

Para subir em servidor, ver [DEPLOYMENT.md](./DEPLOYMENT.md).
Para rodar os testes, ver [TESTING.md](./TESTING.md).

**Última revisão:** 2026-09-21.

> **Estado atual do repositório:** o Épico 0 entregou a fundação (documentação,
> ADRs, `schema.prisma`, esqueleto do Compose) e o Épico 1 entregou
> `backend/Dockerfile` e `frontend/Dockerfile`. Falta o **código de aplicação**:
> não há `package.json` em `backend/` nem em `frontend/`, então os Dockerfiles
> ainda não constroem. Os passos marcados **[Épico 2+]** dependem desse código.
> O que está marcado **[hoje]** funciona neste commit.

---

## 1. Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Docker Engine | 24+ | subir a stack |
| Docker Compose | v2 (plugin `docker compose`) | idem |
| Node.js | 20 LTS | rodar backend/frontend fora do contêiner, Prisma CLI |
| Git | 2.30+ | |

Conferir:

```bash
docker --version && docker compose version && node --version && git --version
```

Node 20 é a versão do CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
Outra major pode passar na sua máquina e quebrar no CI.

---

## 2. Clone e variáveis de ambiente

```bash
git clone https://github.com/lussandro/oficina-erp.git
cd oficina-erp
cp .env.example .env
```

`.env` **nunca** é commitado — o `.gitignore` o exclui e o CI falha o PR se ele
aparecer versionado. Segredo real vive em GitHub Secrets, referenciado como
`${{ secrets.NOME }}`.

### 2.1 Variáveis obrigatórias

Sem estas cinco o Compose **recusa subir**, com mensagem dizendo qual falta.
Isso é proposital: não existe senha padrão no código
([ADR-0006](./adr/0006-bootstrap-do-admin.md)).

| Variável | O que é |
|---|---|
| `POSTGRES_PASSWORD` | senha do Postgres |
| `JWT_SECRET` | assinatura do access token |
| `JWT_REFRESH_SECRET` | assinatura do refresh token — **diferente** do anterior |
| `SEED_ADMIN_EMAIL` | e-mail do primeiro administrador |
| `SEED_ADMIN_PASSWORD` | senha do primeiro administrador |

Gerar os segredos:

```bash
openssl rand -base64 48   # rode uma vez para cada JWT_*
```

`SEED_ADMIN_PASSWORD` é a senha com que você vai logar. Escolha uma real — ela
cria um usuário `ADMIN` de verdade.

### 2.2 Variáveis opcionais

Todas têm default no Compose e só precisam de valor se você quiser mudar:
`POSTGRES_USER` (`oficina`), `POSTGRES_DB` (`oficina_erp`), `POSTGRES_PORT`
(`5432`), `BACKEND_PORT` (`3001`), `FRONTEND_PORT` (`3000`), `API_PREFIX`
(`api/v1`), `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `JWT_EXPIRES_IN` (`15m`),
`JWT_REFRESH_EXPIRES_IN` (`7d`). A lista completa e comentada está em
[`.env.example`](../.env.example).

Porta ocupada na sua máquina? Mude a variável, não o `docker-compose.yml`.

---

## 3. Subir a stack

### 3.1 Hoje — apenas o banco

```bash
docker compose up -d db
docker compose ps --format '{{.Service}} {{.State}}'
```

Esperado: `db running`. Os serviços `backend` e `frontend` estão sob o profile
`app` porque, embora já tenham Dockerfile (Épico 1), ainda não têm
`package.json`: sem o profile, `docker compose up` sobe só o banco em vez de
falhar num build que hoje não tem como completar.

Conferir que o banco aceita conexão:

```bash
docker compose exec db pg_isready -U oficina -d oficina_erp
# -> /var/run/postgresql:5432 - accepting connections
```

### 3.2 [Épico 2+] — sistema inteiro

```bash
docker compose --profile app up --build
```

Banco vazio → migrations → seed → login funciona, sem passo manual. Hoje este
comando **falha no build**, porque não existe `package.json` em `backend/` nem
em `frontend/` — é o comportamento esperado até o código de aplicação chegar.

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| OpenAPI JSON | http://localhost:3001/api/docs-json |
| Health | http://localhost:3001/health |
| Postgres | localhost:5432 |

Login: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do seu `.env`.

---

## 4. [Épico 2+] Rodar fora do contêiner

Útil para ter hot reload e depurador. O banco continua no Docker.

```bash
docker compose up -d db          # só o banco
```

**Backend:**

```bash
cd backend
npm ci
npx prisma generate              # gera o client a partir do schema
npx prisma migrate dev           # aplica migrations no banco local
npm run start:dev                # http://localhost:3001
```

`DATABASE_URL` fora do contêiner aponta para `localhost`, não para `db`:

```
DATABASE_URL=postgresql://oficina:<sua-senha>@localhost:5432/oficina_erp?schema=public
```

`db` é o nome do serviço na rede do Compose e não resolve no seu host.

**Frontend:**

```bash
cd frontend
npm ci
npm run dev                      # http://localhost:3000
```

---

## 5. Comandos do dia a dia

```bash
docker compose logs -f backend          # seguir log de um serviço
docker compose restart backend          # reiniciar sem rebuild
docker compose down                     # parar, PRESERVANDO os dados
docker compose down -v                  # parar e APAGAR o volume do banco
docker compose exec db psql -U oficina -d oficina_erp   # shell SQL
```

`down -v` apaga o volume `pgdata`. Não é o comando para "reiniciar a stack" — é
o comando para recomeçar do zero de propósito.

Prisma (dentro de `backend/`): ver
[DATABASE.md §7](./DATABASE.md#7-migrations).

---

## 6. Fluxo de contribuição

```bash
git checkout -b feature/<modulo>
# ... trabalho ...
git commit -m "..."
git push -u origin feature/<modulo>
gh pr create
```

- Branch por tarefa (`feature/<modulo>`, `fix/<assunto>`, `docs/<assunto>`).
  Nunca commit direto na principal.
- PR sempre, revisado pelo Reviewer. O template de PR está em
  [`.github/pull_request_template.md`](../.github/pull_request_template.md).
- Toda tarefa carrega critério de aceite executável. "Buildou" não é evidência —
  evidência é a saída do comando colada no PR ou na issue.
- Mudança em contrato compartilhado (`schema.prisma`, OpenAPI) se anuncia no PR,
  com Backend e Frontend marcados.
- Antes de abrir PR que toca `.tsx`, rode a verificação de tokens de cor:

```bash
grep -rnE "text-gray-[0-9]|bg-(black|white)|#[0-9a-fA-F]{6}" src/app src/components \
  | grep -v globals.css     # -> vazio
```

---

## 7. Quando algo não sobe

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `defina POSTGRES_PASSWORD no .env` | variável obrigatória vazia | preencha as cinco da §2.1 |
| `port is already allocated` | porta ocupada no host | mude `POSTGRES_PORT`/`BACKEND_PORT`/`FRONTEND_PORT` no `.env` |
| Backend não conecta, banco está de pé | `DATABASE_URL` com host errado | `db` dentro do Compose, `localhost` fora |
| `P1001: Can't reach database server` | banco ainda subindo | aguarde o healthcheck: `docker compose ps` |
| Migration pendente | `migrate deploy` não rodou | `cd backend && npx prisma migrate status` |
| Mudou `.env` e nada mudou | Compose lê `.env` na subida | `docker compose up -d --force-recreate` |
| Frontend dá 401 em tudo | `NEXT_PUBLIC_API_URL` errado | confira contra a URL da §3.2 |

Erro de ferramenta externa (Docker, Prisma, Postgres) **chega verbatim**. Ao
relatar, cole a mensagem original inteira — resumir em "não subiu" apaga a
informação que resolve.

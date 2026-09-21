# Deploy — Oficina ERP

Como levar o sistema para um servidor e mantê-lo lá. Para a máquina do
desenvolvedor, ver [SETUP.md](./SETUP.md).

**Última revisão:** 2026-09-21.

> **Estado atual:** o alvo de deploy é **Docker Compose em um host único** — uma
> oficina tem dezenas de OS por dia, não milhares por segundo
> ([ADR-0002](./adr/0002-stack.md)). A imagem de backend e frontend passa a
> existir no **Épico 1**; a automação de deploy é entrega do **Épico 19 (DevOps
> contínuo)**. Este documento fixa o procedimento e as invariantes que o Épico 19
> automatiza. Trechos marcados **[Épico 1+]** dependem dos Dockerfiles.

---

## 1. Topologia

```
            Internet
                │  HTTPS (443)
        ┌───────▼────────┐
        │ Proxy reverso  │  TLS, cabeçalhos de segurança
        │ (nginx/Caddy)  │
        └───┬────────┬───┘
            │        │
   :3000 ┌──▼───┐ ┌──▼─────┐ :3001
         │front │ │backend │────► ┌──────────┐
         │Next  │ │NestJS  │      │ Postgres │ volume pgdata
         └──────┘ └────────┘      └──────────┘
```

Regras da topologia:

- **Só o proxy escuta na internet.** `3000`, `3001` e `5432` ficam em `127.0.0.1`
  ou na rede interna do Compose — nunca publicados na interface pública.
- **Postgres não é exposto.** Acesso administrativo via `docker compose exec` ou
  túnel SSH.
- **TLS termina no proxy.** HTTP redireciona para HTTPS; certificado por Let's
  Encrypt com renovação automática.

Detalhe dos cabeçalhos e do endurecimento: [SECURITY.md](./SECURITY.md).

---

## 2. Pré-requisitos do host

| Item | Mínimo |
|---|---|
| SO | Linux com Docker Engine 24+ e Compose v2 |
| CPU / RAM | 2 vCPU / 4 GB |
| Disco | 20 GB (banco + imagens + backups) |
| Rede | 443 aberta; 22 restrita |
| DNS | domínio apontando para o host, antes de emitir o certificado |

---

## 3. Segredos

**Nenhuma credencial em repositório, issue, comentário ou log.** Em produção e
CI, cada valor vem de GitHub Secrets, referenciado como `${{ secrets.NOME }}`.

| Segredo | Onde é usado |
|---|---|
| `POSTGRES_PASSWORD` | banco |
| `JWT_SECRET` | assinatura do access token |
| `JWT_REFRESH_SECRET` | assinatura do refresh token — diferente do anterior |
| `SEED_ADMIN_EMAIL` | primeiro administrador |
| `SEED_ADMIN_PASSWORD` | senha do primeiro administrador |
| `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` | acesso do workflow de deploy (Épico 19) |

- Segredo de produção **não** é o de desenvolvimento. Gere novos:
  `openssl rand -base64 48`.
- No host, `.env` pertence ao usuário do deploy com permissão `600`.
- Rotação: trocar `JWT_SECRET` invalida todos os access tokens em circulação
  (usuários refazem login); trocar `JWT_REFRESH_SECRET` invalida também as
  sessões renováveis. É o procedimento correto em suspeita de vazamento.
- Segredo que vazou em log ou issue está **comprometido**: rotacione, não apague
  a mensagem e siga o procedimento de [SECURITY.md](./SECURITY.md).

---

## 4. [Épico 1+] Primeiro deploy

```bash
# no host, como o usuário de deploy
git clone https://github.com/lussandro/oficina-erp.git
cd oficina-erp

cp .env.example .env
chmod 600 .env
# preencha os cinco obrigatórios da §3 com valores de produção
# NODE_ENV=production
# CORS_ORIGIN=https://<seu-dominio>
# NEXT_PUBLIC_API_URL=https://<seu-dominio>/api/v1

docker compose --profile app up -d --build
```

Verificação (cole a saída no registro do deploy):

```bash
docker compose ps --format '{{.Service}} {{.State}}'   # -> todos running
curl -s http://localhost:3001/health                    # -> {"status":"ok","db":"up"}
```

O primeiro start roda `prisma migrate deploy` e o seed, que cria o administrador
com `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. **Banco vazio → deploy → login
funciona**, sem passo manual ([ADR-0006](./adr/0006-bootstrap-do-admin.md)).

---

## 5. [Épico 1+] Atualizar uma versão em produção

```bash
cd oficina-erp
git pull --ff-only origin main
docker compose --profile app up -d --build
docker compose ps --format '{{.Service}} {{.State}}'
curl -s http://localhost:3001/health
```

Ordem obrigatória: **backup antes de migration**. As migrations rodam no start
do backend (`prisma migrate deploy` — nunca `migrate dev`, nunca `migrate
reset`, que apagam dados).

Migration destrutiva (remover coluna, estreitar tipo) é feita em duas etapas,
com um deploy entre elas: primeiro escrever nos dois lugares, depois remover o
antigo. Ver [DATABASE.md §7](./DATABASE.md#7-migrations).

### Rollback

1. Voltar o código: `git checkout <tag-ou-sha-anterior> && docker compose --profile app up -d --build`.
2. Se a migration foi destrutiva, código antigo **não** volta a funcionar
   sozinho: restaure o dump da §6.

Por isso o backup imediatamente antes do deploy não é opcional.

---

## 6. Backup e restauração

```bash
# dump diário
docker compose exec -T db pg_dump -U oficina -Fc oficina_erp > "backup-$(date +%F).dump"

# restauração
docker compose exec -T db pg_restore -U oficina -d oficina_erp --clean < backup-AAAA-MM-DD.dump
```

- **Antes de todo deploy que carrega migration.**
- Diário, automatizado, com destino **fora do host** (um disco só protege contra
  erro de software, não contra perda da máquina).
- Retenção sugerida: 7 diários + 4 semanais.
- **Backup não testado não é backup.** Restaure periodicamente num banco
  descartável e confirme que o sistema sobe contra ele.
- Os dados vivem no volume nomeado `pgdata`. `docker compose down -v` **apaga o
  volume**: nunca é o comando para reiniciar a stack.

---

## 7. Operação

```bash
docker compose logs -f backend            # log de um serviço
docker compose ps                         # estado e healthcheck
docker compose restart backend            # reinício sem rebuild
docker stats --no-stream                  # CPU/memória
df -h                                     # disco (imagens antigas enchem o host)
docker image prune -f                     # limpar imagens órfãs
```

Sinais de saúde:

| Sinal | Onde | Esperado |
|---|---|---|
| Healthcheck do backend | `docker compose ps` | `healthy` |
| Healthcheck do banco | `pg_isready` no Compose | `accepting connections` |
| `/health` | `curl` | `{"status":"ok","db":"up"}` |

`/health` fica fora do prefixo `/api/v1` e não exige autenticação: é o
healthcheck do Compose e do CI ([API.md §3](./API.md#3-saúde)).

**Log não carrega segredo nem dado pessoal desnecessário.** Se aparecer token,
senha ou CPF em log, é bug — trate como incidente ([SECURITY.md](./SECURITY.md)).

---

## 8. CI/CD

Hoje ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)), a cada PR e
push para `main`:

| Job | Roda | Ativo |
|---|---|---|
| `foundation` | `prisma validate`, `docker compose config`, guarda contra `.env` versionado | sempre |
| `backend` | `npm ci`, `prisma generate`, `migrate deploy`, lint, `tsc --noEmit`, testes (Postgres de serviço), build | quando `backend/package.json` existir |
| `frontend` | `npm ci`, lint, `tsc --noEmit`, guarda de cor literal, testes, build | quando `frontend/package.json` existir |

A detecção acontece **depois** do checkout, num step: `hashFiles()` no `if` de
job roda antes do checkout e devolveria vazio para sempre.

**Deploy automático é do Épico 19.** Forma acordada: workflow disparado por tag
`v*`, que roda os mesmos jobs, conecta ao host por SSH com
`DEPLOY_SSH_KEY`, executa o procedimento da §5 e falha se o `/health` não voltar
`ok`. Enquanto não existir, o deploy é o procedimento manual da §5 — registrado
com as saídas coladas na issue.

---

## 9. Fora do escopo

Kubernetes, autoscaling, réplica de leitura, CDN e multi-região. Um host com
Compose atende o porte do negócio. Se o volume mudar, a decisão entra por ADR
novo — não por improviso no deploy.

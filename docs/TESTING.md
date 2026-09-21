# Testes — Oficina ERP

O que se testa, com o quê, e o que conta como evidência.

**Última revisão:** 2026-09-21.

> **Estado atual:** o Épico 0 entregou a fundação. As suítes de backend e
> frontend passam a existir no **Épico 1**, e o roteiro E2E completo é o
> **Épico 22**. Os jobs `backend` e `frontend` do CI já estão escritos e ligam
> sozinhos quando o `package.json` correspondente aparecer. Trechos marcados
> **[Épico 1+]** dependem disso.

---

## 1. A regra

**Rodou > compilou.** "Buildou", "tipa", "lint limpo" não é evidência de nada.
Evidência é a saída real do comando ou da requisição, colada na issue ou no PR.

Sem execução, a tarefa não é `done` — é `blocked`.

Toda issue nasce com um bloco `## Aceite` contendo pelo menos um comando
executável e o resultado esperado:

```
## Aceite
curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health   -> 200
```

Quem cria a issue escreve o bloco; quem executa roda e cola a saída. Issue sem
`## Aceite` executável volta para quem criou — não se adivinha teste.

**Smoke check testa o comportamento real, não o imaginado.** Rota protegida sem
sessão responde `3xx` ou `401`, não `200`. Antes de afirmar que um check está
correto, rode-o contra o sistema no ar.

---

## 2. Pirâmide

| Camada | Ferramenta | Cobre | Onde |
|---|---|---|---|
| Unidade | Jest | regra de negócio pura: totais, transições de status, validação de documento/placa | `backend/src/**/*.spec.ts` |
| Integração / API | Jest + Supertest | rota + guard + validação + banco real | `backend/test/**/*.e2e-spec.ts` |
| Componente | Vitest + Testing Library | componente do design system e tela: estados vazio/carregando/erro | `frontend/src/**/*.test.tsx` |
| E2E | Playwright | fluxo do usuário no navegador, sobre `docker compose up` | `e2e/` |

Playwright em vez de Cypress: [ADR-0005](./adr/0005-e2e-playwright.md).

Teste de integração roda contra **Postgres de verdade**, não mock. O CI sobe um
`postgres:16-alpine` como serviço para isso — banco mockado não pega violação de
`@unique`, `CHECK` nem comportamento de transação, que é justamente o que se
quer testar.

---

## 3. O que é obrigatório testar

Regras nascidas de defeito real, não de meta de cobertura:

1. **Cálculo de dinheiro.** `total = servicesTotal + itemsTotal − discount`,
   recalculado no servidor. Teste que o total enviado pelo cliente é **ignorado**
   ([ARCHITECTURE §4.4](./ARCHITECTURE.md#44-totais-da-os)).
2. **Máquina de estados da OS.** A tabela de transições de
   [ARCHITECTURE §4.3](./ARCHITECTURE.md#43-máquina-de-estados-da-os-lacuna-9)
   inteira: cada transição permitida e, sobretudo, as proibidas devolvendo `409`.
3. **Efeito colateral em transação.** `FINALIZADA` baixa estoque (`CONSUMO`);
   cancelar a partir de `FINALIZADA` devolve (`DEVOLUCAO`). Falha no meio não
   deixa OS finalizada com estoque intacto.
4. **RBAC.** Para cada rota protegida: perfil autorizado passa, perfil sem a
   permissão recebe `403`, sem token recebe `401`. `ATENDENTE` não dá desconto.
5. **Unicidade.** Documento, placa, SKU e e-mail duplicados devolvem `422` com
   mensagem legível — não `500`.
6. **Estado inicial.** Banco vazio → migrations + seed → login do admin
   funciona. É teste, não expectativa ([ADR-0006](./adr/0006-bootstrap-do-admin.md)).
7. **Tela: os três estados.** Vazio, carregando e erro. Lista sem resultado diz
   o que fazer em seguida.

Cobertura numérica não é meta. Código de regra de negócio sem teste é o que
bloqueia merge.

---

## 4. [Épico 1+] Rodar

**Backend** (`cd backend`):

```bash
npm test                    # unidade + integração
npm test -- --watch         # durante o desenvolvimento
npm test -- customers       # só um módulo
npm run test:cov            # relatório de cobertura
npx tsc --noEmit            # typecheck
npm run lint
```

Integração precisa de banco:

```bash
docker compose up -d db
export DATABASE_URL='postgresql://oficina:<senha>@localhost:5432/oficina_erp_test?schema=public'
npx prisma migrate deploy
npm test
```

Use um banco **de teste** separado. A suíte limpa tabelas entre casos.

**Frontend** (`cd frontend`):

```bash
npm test
npm test -- --watch
npx tsc --noEmit
npm run lint
```

**E2E** (Épico 22, raiz do repositório):

```bash
docker compose --profile app up -d --build
npx playwright test
npx playwright test --ui       # modo interativo
npx playwright show-report
```

---

## 5. Verificações fora das suítes

Checks pequenos que pegam classe inteira de defeito.

**Documentação presente** (aceite do Épico 20):

```bash
for f in README.md docs/ARCHITECTURE.md docs/DATABASE.md docs/API.md \
         docs/SETUP.md docs/DEPLOYMENT.md docs/TESTING.md docs/SECURITY.md; do
  test -f "$f" || echo "FALTA:$f"
done
# -> sem saída
```

**Schema Prisma válido:**

```bash
npx --yes prisma@5 validate --schema backend/prisma/schema.prisma
```

**Compose válido:**

```bash
docker compose config --quiet
```

**Nenhum `.env` versionado:**

```bash
git ls-files --error-unmatch .env 2>/dev/null && echo "ERRO: .env versionado"
```

**Cor literal fora dos tokens** (obrigatório em todo card que toca tela):

```bash
grep -rnE "text-gray-[0-9]|bg-(black|white)|#[0-9a-fA-F]{6}" src/app src/components \
  | grep -v globals.css
# -> vazio
```

Saída não vazia significa cor solta fora do token. Corrija antes de fechar o
card. Este mesmo grep roda no job `frontend` do CI.

---

## 6. CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml), a cada PR e push para
`main`:

| Job | Conteúdo |
|---|---|
| `foundation` | `prisma validate`, `docker compose config`, guarda contra `.env` versionado — roda sempre |
| `backend` | `npm ci` → `prisma generate` → `migrate deploy` → lint → `tsc --noEmit` → `npm test` → `npm run build`, com Postgres de serviço |
| `frontend` | `npm ci` → lint → `tsc --noEmit` → guarda de cor literal → `npm test` → `npm run build` |

`backend` e `frontend` ficam inativos até o `package.json` correspondente
existir, e ligam sozinhos quando ele aparecer.

Segredo em CI vem de GitHub Secrets (`${{ secrets.NOME }}`) — nunca literal no
workflow.

**CI verde não substitui o aceite da issue.** O CI prova que o repositório está
íntegro; o `## Aceite` prova que a funcionalidade pedida funciona.

---

## 7. Relatar falha

- **Cole a saída original, verbatim** — inclusive código HTTP e corpo. Erro de
  sistema externo nunca vira "falha na operação": o texto original é a
  informação que resolve.
- Diga qual comando rodou, em que diretório, e com qual estado de banco.
- Teste que falha de forma intermitente é bug em aberto, não ruído. Registre com
  a saída antes de repetir a execução.

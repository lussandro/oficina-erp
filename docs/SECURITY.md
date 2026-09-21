# Segurança — Oficina ERP

O sistema guarda **dado pessoal de cliente**: nome, CPF/CNPJ, telefone,
endereço, veículo e histórico de serviço. Isso define o nível de cuidado —
não é um CRUD interno sem consequência.

**Última revisão:** 2026-09-21.

> **Estado atual:** as decisões abaixo estão fixadas nos ADRs, no
> `schema.prisma` e no `docker-compose.yml` do Épico 0. A implementação chega
> com o Épico 2 (Autenticação & RBAC) e é auditada continuamente pelo Épico 18.
> Trechos marcados **[Épico 2+]** descrevem o que a implementação deve cumprir.

---

## 1. Segredos

**Nenhuma credencial em repositório, issue, comentário, log ou PR.** Esta é a
regra que não tem exceção.

| Onde vive | O quê |
|---|---|
| GitHub Secrets | todo segredo de CI e produção, referenciado como `${{ secrets.NOME }}` |
| `.env` local | segredo de desenvolvimento, fora do Git (`.gitignore`), permissão `600` no servidor |
| Código | **nada** |

Garantias já ativas:

- `.gitignore` exclui `.env` e `.env.*`, exceto `.env.example`.
- O job `foundation` do CI falha o PR se `.env` estiver versionado.
- O Compose **recusa subir** sem `POSTGRES_PASSWORD`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`. Não existe
  default inseguro que alguém esqueça de trocar.

Geração: `openssl rand -base64 48`, um valor por segredo. `JWT_SECRET` e
`JWT_REFRESH_SECRET` são **diferentes** — reusar o mesmo permite que um access
token seja apresentado como refresh.

**Nunca invente um valor que a fonte de verdade não deu** — senha, ID, chave ou
config. Dado faltando se recusa, dizendo qual cadastro ou secret precisa
existir. Preencher buraco com um default plausível "para não travar o fluxo" é o
pior tipo de bug: parece certo e quebra depois.

### Segredo vazado

Se um segredo apareceu em log, issue, comentário ou commit, ele está
**comprometido** — apagar a mensagem não o descompromete.

1. Rotacione o valor imediatamente (novo secret, redeploy).
2. Trocar `JWT_SECRET` derruba os access tokens em circulação; trocar
   `JWT_REFRESH_SECRET` derruba também as sessões renováveis. É o efeito
   desejado.
3. Registre o incidente na issue: o que vazou, por onde, quando foi rotacionado.
   Sem colar o valor.
4. Se vazou em commit, o histórico do Git continua com ele. Rotacionar é o que
   resolve; reescrever histórico é complemento, não substituto.

---

## 2. Autenticação

[ADR-0003](./adr/0003-auth-jwt.md).

| Item | Decisão |
|---|---|
| Hash de senha | **Argon2id**. Nunca MD5, SHA-1 ou SHA-256 puro |
| Access token | JWT, 15 min |
| Refresh token | 7 dias, **rotacionado a cada uso**, revogável |
| Armazenamento do refresh | tabela `refresh_tokens` guarda o **hash** (`tokenHash @unique`) |
| Logout | marca `revokedAt` — não depende só do cliente descartar o token |

Guardar o hash e não o token é deliberado: vazamento da tabela `refresh_tokens`
não dá sessão a ninguém.

**[Épico 2+] Requisitos da implementação:**

- Login com e-mail inexistente e login com senha errada devolvem a **mesma**
  resposta e no mesmo tempo aproximado. Mensagem diferente entrega quais e-mails
  existem.
- Rate limit no `POST /auth/login` por IP e por conta.
- Refresh reapresentado depois de rotacionado é sinal de roubo de token: revoga
  a cadeia inteira daquele usuário.
- `active = false` bloqueia login sem apagar o usuário — histórico de auditoria
  precisa do registro.
- Senha nunca aparece em log, em resposta de API, nem em mensagem de erro.

### Primeiro administrador

Criado pelo seed, com senha vinda de `SEED_ADMIN_PASSWORD`, variável
**obrigatória**. Não existe senha padrão no código
([ADR-0006](./adr/0006-bootstrap-do-admin.md)). Variável ausente faz o seed
falhar dizendo qual falta — em vez de criar um `admin/admin` que fica de pé
para sempre.

---

## 3. Autorização

RBAC por **permissão nomeada** (`<recurso>:<ação>`), não por flag CRUD por
módulo. A referência dava `is_create/is_read/is_edit/is_delete` e não conseguia
expressar "pode fechar OS mas não pode dar desconto" (lacuna 11).

| Perfil | Escopo |
|---|---|
| `ADMIN` | tudo, inclusive usuários e configuração |
| `GERENTE` | operação completa + relatórios financeiros + desconto; não gerencia usuários |
| `ATENDENTE` | clientes, veículos, orçamentos, abertura de OS; sem custo nem desconto |
| `MECANICO` | vê e atualiza as OS atribuídas a si; registra consumo de peça; sem valores |

- O mapa perfil → permissões vive em **código versionado**
  (`common/rbac/permissions.ts`), não em linha de banco editável: elevar
  privilégio exige PR e review.
- Autorização é verificada **no servidor, em toda rota**. Esconder o botão no
  frontend é usabilidade, não segurança.
- Permissão granular já acordada: `serviceorder:close`, `serviceorder:discount`,
  `stock:adjust`, `report:financial`, `audit:read`.
- Ausência de permissão é `403`; ausência de token é `401`. Não confundir os dois.

Cobertura de teste exigida: [TESTING.md §3](./TESTING.md#3-o-que-é-obrigatório-testar).

---

## 4. Dados do cliente

- **Minimização**: coletar só o que a operação usa. Não há campo para dado
  sensível além do necessário ao serviço.
- **Soft delete** (`deletedAt`) em cadastros: o histórico de OS não pode perder
  o cliente que o originou. Exclusão definitiva, quando pedida, é procedimento
  deliberado — não efeito colateral de um clique.
- **Auditoria imutável**: `audit_logs` registra `before`/`after` e nunca é
  apagada. Remover um usuário usa `SetNull` justamente para preservar o rastro
  do que ele fez.
- **Movimento de estoque é append-only**: correção é `AJUSTE`, nunca `UPDATE` ou
  `DELETE`.
- **Log não carrega dado pessoal desnecessário** nem token, senha ou documento
  completo. Se aparecer, é bug — trate como incidente da §1.
- Acesso ao log de auditoria exige `audit:read` (ADMIN) e é somente leitura: não
  existe rota de escrita nem de exclusão.

---

## 5. Superfície da API

Regras já fixadas em [API.md](./API.md) e
[ARCHITECTURE §3](./ARCHITECTURE.md#3-camadas-do-backend):

| Vetor | Defesa |
|---|---|
| Entrada malformada | `ValidationPipe` com `whitelist: true` e `forbidNonWhitelisted: true` — campo não declarado é **rejeitado**, não ignorado |
| SQL injection | Prisma parametrizado. SQL cru só em relatório agregado, e ali com `Prisma.sql` |
| Enumeração de IDs | PK `uuid`, não sequencial. Número de OS visível é separado da PK |
| Valor adulterado | `servicesTotal`, `itemsTotal` e `total` vindos do cliente são **ignorados** e recalculados no servidor; só `discount` é aceito, e com permissão |
| Transição de estado inválida | máquina de estados validada no service → `409` com as transições permitidas em `details` |
| CORS | `CORS_ORIGIN` explícito, nunca `*` em produção |
| Paginação abusiva | `pageSize` máximo 100 |
| Upload | fora do escopo do MVP; quando entrar, exige tipo, tamanho e nome sanitizado |

### Mensagem de erro

Formato único: `{ statusCode, error, message, details? }`, com `message`
legível em pt-BR.

- **Erro de sistema externo chega verbatim** em `details`, inclusive código HTTP
  e corpo originais. Nunca resumido em "falha na operação" — o texto original é
  a informação que resolve.
- Erro interno **não** expõe stack trace, caminho de arquivo, query nem nome de
  coluna ao cliente. Isso vai para o log do servidor.
- Erro de autenticação não revela se o e-mail existe.

---

## 6. Transporte e infraestrutura

- **HTTPS obrigatório** em produção; HTTP redireciona. TLS termina no proxy
  reverso ([DEPLOYMENT.md §1](./DEPLOYMENT.md#1-topologia)).
- **Postgres não é exposto à internet.** `5432` fica na rede interna do Compose;
  acesso administrativo por `docker compose exec` ou túnel SSH.
- Backend e frontend só recebem tráfego do proxy.
- Cabeçalhos no proxy: `Strict-Transport-Security`, `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY` (ou CSP `frame-ancestors`),
  `Referrer-Policy: strict-origin-when-cross-origin`.
- Imagem base atualizada; `npm audit` no ciclo do Épico 18.
- Backup é dado pessoal também: guarde com o mesmo cuidado do banco, fora do
  host ([DEPLOYMENT.md §6](./DEPLOYMENT.md#6-backup-e-restauração)).

---

## 7. No desenvolvimento

- Branch por tarefa, PR sempre, revisão pelo Reviewer. Nunca commit direto na
  principal.
- **Mudança cirúrgica**: cada linha alterada rastreia ao que foi pedido. Não
  refatorar nem "melhorar" código adjacente no mesmo PR — diff grande esconde
  defeito.
- Não apagar comentário ou código que você não entendeu. Dead code não
  relacionado: avisar, não remover.
- Dependência nova entra com justificativa no PR. Poucas dependências, menos
  superfície.
- O checklist do [template de PR](../.github/pull_request_template.md) inclui
  "nenhuma credencial em código, log, comentário ou issue". Ele é conferido, não
  decorativo.

---

## 8. Reportar vulnerabilidade

Abra issue com prioridade `critical` descrevendo **impacto e reprodução**, sem
colar credencial ou dado pessoal real. Se houver segredo envolvido, rotacione
primeiro (§1) e só depois registre.

Suspeita de acesso indevido: rotacione `JWT_SECRET` e `JWT_REFRESH_SECRET`
(derruba todas as sessões), verifique `audit_logs` por `entity`, `userId` e
`createdAt`, e registre o achado na issue.

---

## 9. Fora do escopo do MVP

Registrado para não voltar como surpresa: MFA, SSO/OAuth externo, criptografia
em repouso por coluna, WAF, pentest automatizado e retenção/expurgo automático
por política de privacidade. Nenhum está no briefing; cada um entra por demanda
explícita, com épico e ADR próprios.

# ADR-0006 — Admin inicial criado pelo seed, com senha via variável obrigatória

**Status:** Aceito · 2026-09-21

## Contexto

Sistema com login e RBAC tem o problema do ovo e da galinha: sem usuário não se
loga, e sem login não se cria usuário. A referência resolveu publicando
`admin@admin.com` / `admin@123` no README — credencial conhecida em qualquer
instalação que esqueceu de trocar.

A definição de pronto deste projeto exige que o sistema suba do zero: banco vazio
→ deploy → sistema usável, sem passo manual. E proíbe inventar valor que a fonte
de verdade não deu, incluindo senha.

## Decisão

O seed cria o primeiro usuário `ADMIN` lendo **variáveis de ambiente obrigatórias**:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Comportamento:

1. Se qualquer uma faltar, o seed **falha com erro explícito** nomeando a
   variável ausente. Não existe senha padrão, nem gerada, nem no código.
2. Se já houver usuário `ADMIN`, o seed não faz nada (idempotente).
3. Senha guardada com Argon2id; o valor em claro nunca vai para log.
4. `.env.example` traz as chaves com valor vazio e um comentário dizendo como
   gerar. Em produção, vem de GitHub Secrets.

## Consequências

- `docker compose up` com `.env` preenchido dá sistema usável sem passo manual.
- `docker compose up` sem as variáveis **falha no seed**, dizendo o que falta —
  falha alta e clara, não sistema no ar com credencial adivinhável.
- CI define as duas variáveis com valor de teste no job, como qualquer outro segredo.

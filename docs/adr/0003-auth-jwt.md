# ADR-0003 — JWT com refresh rotacionado, senha em Argon2id

**Status:** Aceito · 2026-09-21

## Contexto

Frontend e backend são serviços separados, então sessão via cookie de servidor
não é o caminho natural. A referência usava sessão do Laravel e RBAC por tabela
de módulo, que não expressa permissão de ação.

## Decisão

- **Access token JWT**, 15 minutos, em `Authorization: Bearer`.
- **Refresh token**, 7 dias, rotacionado a cada uso, persistido com hash e
  revogável (logout invalida de fato).
- **Argon2id** para senha. Não bcrypt: Argon2id é o recomendado atual do OWASP e
  resiste melhor a ataque com GPU.
- Payload do access carrega `sub`, `role` e `permissions` — autorização não bate
  no banco a cada request.
- **Permissões nomeadas** `<recurso>:<ação>`, mapeadas por perfil em código
  versionado, não em linha de banco editável: mudar permissão passa por PR.

## Consequências

- Revogar perfil só surte efeito no próximo refresh (≤ 15 min). Aceitável para
  uma oficina; se virar problema, entra blacklist de token.
- `JWT_SECRET` e `JWT_REFRESH_SECRET` são obrigatórios: backend recusa subir sem
  eles, em vez de cair num default inseguro.
- Frontend precisa de interceptor que renova no `401` e refaz a requisição.

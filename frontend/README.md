# Frontend — Next.js

Next.js 16 (App Router) + TypeScript + Tailwind 4. O `Dockerfile` builda com
`output: 'standalone'` (ver `next.config.js`) — mudar o output exige mudar os
dois lados.

## Comandos

```bash
npm ci
npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
npm test
npm run build
```

`NEXT_PUBLIC_API_URL` aponta para o backend (padrão
`http://localhost:3001/api/v1`). O `.env.example` da raiz lista as variáveis.

## Onde fica o quê

```
src/app/          rotas (App Router); globals.css tem os tokens
src/components/   design system
src/lib/          cn.ts (classes) e api.ts (cliente HTTP)
```

Antes de escrever JSX: leia `src/components` e use o que existe. Cor vem de
token em `src/app/globals.css`, nunca literal. Regras em
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §7 e catálogo em
[`../docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md).

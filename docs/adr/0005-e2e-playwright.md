# ADR-0005 — Playwright para testes E2E

**Status:** Aceito · 2026-09-21

## Contexto

O plano do BAC-33 deixou "Playwright ou Cypress" em aberto para o Épico 0. O
Épico 22 exige roteiro E2E completo de 16 passos sobre `docker compose up`.

## Decisão

Playwright.

- Roda os três navegadores (Chromium, Firefox, WebKit) sem configuração extra —
  o requisito de uso em celular pede validação em WebKit.
- Emulação de dispositivo nativa (`devices['iPhone 13']`), e mobile é requisito
  declarado, não adaptação.
- Auto-waiting reduz teste instável, que é o que faz suíte E2E ser desligada.
- `npx playwright test` em contêiner, sem servidor de apoio no CI.

Cypress é maduro e tem boa DX, mas o suporte a WebKit é experimental e o modelo
de execução dentro do navegador complica cenário multi-aba/download — e o Épico
15 exige exportar PDF/CSV/XLSX, que é download.

## Consequências

- Frontend escreve os testes de componente em Vitest + Testing Library; E2E é
  Playwright, sob o Reviewer (QA).
- CI precisa de imagem com os navegadores (`mcr.microsoft.com/playwright`).
- O roteiro de 16 passos do Épico 22 vira spec Playwright executável, não checklist manual.

# ADR-0004 — Dinheiro em Decimal(12,2); string decimal no JSON

**Status:** Aceito · 2026-09-21

## Contexto

A referência usava `decimal` sem precisão explícita no banco, `double` para
quilometragem, e calculava todos os totais em JavaScript no navegador,
persistindo o valor recebido sem recalcular. Um cliente HTTP qualquer grava
`total = 0`.

## Decisão

1. **Banco**: `Decimal(12,2)` para todo valor monetário. Nunca `Float`/`Double`.
2. **Backend**: `Prisma.Decimal`. Aritmética de dinheiro nunca passa por `number`
   do JavaScript — `0.1 + 0.2 !== 0.3` vira centavo faltando em nota fechada.
3. **API**: valor monetário trafega como **string decimal** (`"1234.50"`).
   `JSON.parse` sobre número decimal devolve float binário; string preserva o valor.
4. **Frontend**: formata para exibir; para somar, usa a string com aritmética
   decimal. Cálculo na tela é conveniência visual — **o servidor recalcula sempre**
   e ignora qualquer total enviado pelo cliente.
5. Percentual de desconto: `Decimal(5,2)`. Desconto em valor: `Decimal(12,2)`.

## Consequências

- DTOs precisam de transformer explícito Decimal ↔ string.
- Frontend não faz `parseFloat` em dinheiro; precisa de helper de formatação e,
  onde somar, de aritmética decimal.
- Total exibido pode divergir do total salvo se houver bug de cálculo no front —
  e é exatamente isso que queremos que apareça, em vez de o valor errado ser
  gravado silenciosamente.

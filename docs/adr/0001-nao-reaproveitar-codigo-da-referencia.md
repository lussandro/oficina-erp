# ADR-0001 — Não reaproveitar código do projeto de referência

**Status:** Aceito · 2026-09-21

## Contexto

`bbroger/oficina-mecanica` é MIT: copiar seria legalmente permitido, bastando
manter o aviso de copyright. A questão é técnica, não jurídica.

A [análise](../REFERENCE_ANALYSIS.md) mostrou que o sistema não tem camada de
domínio. Toda a lógica está em configuração declarativa do CRUDBooster dentro dos
controllers PHP (`$this->col[]`, `$this->form[]`), interpretada em runtime. Não
existem Models de negócio, serviços, nem testes de regra. Os totais financeiros
são calculados em JavaScript no navegador e persistidos como chegam.

## Decisão

Nenhum trecho de código da referência será copiado. O reaproveitamento é
**conceitual**: vocabulário de domínio, modelo de dados e escopo funcional — que
não são objeto de copyright.

O aviso de atribuição MIT fica registrado em `LICENSE`, seção "Third-party
notices", por transparência e para já estar no lugar caso algum trecho venha a
ser copiado no futuro.

## Consequências

- Não há atalho de implementação: cada módulo é escrito do zero.
- Em troca, não herdamos os defeitos estruturais catalogados (totais no cliente,
  OS sem veículo, ausência de estoque, RBAC por tabela).
- A referência continua sendo a melhor fonte para "o que uma oficina precisa" —
  o `REFERENCE_ANALYSIS.md` é consultado em cada épico para não esquecer campo
  que o negócio real usa.

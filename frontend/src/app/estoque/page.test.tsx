import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EstoquePage from './page';

vi.mock('@/lib/session', () => ({ getToken: () => 'token-de-teste' }));

const listMovements = vi.fn();
const listLowStock = vi.fn();
const listProductOptions = vi.fn();
const createMovement = vi.fn();

vi.mock('@/lib/stock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stock')>()),
  listMovements: (...args: unknown[]) => listMovements(...args),
  listLowStock: (...args: unknown[]) => listLowStock(...args),
  listProductOptions: (...args: unknown[]) => listProductOptions(...args),
  createMovement: (...args: unknown[]) => createMovement(...args),
}));

const movement = {
  id: 'm1',
  type: 'ENTRADA' as const,
  quantity: 10,
  unitCost: null,
  resultingQty: 10,
  reason: 'NF 1234',
  documentRef: null,
  createdAt: '2026-09-22T00:00:00.000Z',
  product: { id: 'p1', sku: 'FILT-001', name: 'Filtro de óleo', unit: 'UN' },
};

beforeEach(() => {
  vi.clearAllMocks();
  listMovements.mockResolvedValue({ data: [movement], meta: emptyMeta(1) });
  listLowStock.mockResolvedValue({
    data: [
      { id: 'p1', sku: 'FILT-001', name: 'Filtro de óleo', unit: 'UN', stockQty: 3, minStockQty: 5 },
    ],
    meta: emptyMeta(1),
  });
  listProductOptions.mockResolvedValue({
    data: [{ id: 'p1', sku: 'FILT-001', name: 'Filtro de óleo', unit: 'UN' }],
    meta: emptyMeta(1),
  });
});

describe('EstoquePage', () => {
  it('mostra o movimento com o saldo resultante e o tipo', async () => {
    render(<EstoquePage />);

    expect(screen.getByText('Carregando os movimentos de estoque…')).toBeDefined();

    // "Filtro de óleo" aparece na tabela de movimentos, na de mínimos e no
    // seletor do formulário — o teste procura o valor, não a unicidade.
    await waitFor(() => expect(screen.getAllByText('Filtro de óleo').length).toBeGreaterThan(0));
    // "Entrada" também é uma <option> do formulário; o badge é o <span>.
    expect(screen.getByText('Entrada', { selector: 'span' })).toBeDefined();
    // Quantidade com sinal e unidade — o extrato não depende de cor para dizer
    // se somou ou baixou.
    expect(screen.getByText('+10 UN')).toBeDefined();
    expect(screen.getAllByText('FILT-001').length).toBeGreaterThan(0);
  });

  it('lista a peça abaixo do mínimo com o saldo em falta', async () => {
    render(<EstoquePage />);

    await waitFor(() => expect(screen.getByText('Peças abaixo do mínimo')).toBeDefined());
    expect(screen.getByText('+3 UN')).toBeDefined();
  });

  it('mostra o estado vazio quando não há movimento', async () => {
    listMovements.mockResolvedValue({ data: [], meta: emptyMeta(0) });
    render(<EstoquePage />);

    await waitFor(() => expect(screen.getByText('Nenhum movimento ainda')).toBeDefined());
    expect(
      screen.getByText('Registre a primeira entrada para o saldo das peças sair de zero.'),
    ).toBeDefined();
  });

  it('mostra o erro real do backend, não uma lista vazia', async () => {
    listMovements.mockRejectedValue(new Error('401 Unauthorized'));
    render(<EstoquePage />);

    await waitFor(() =>
      expect(screen.getByText('Não foi possível carregar o estoque')).toBeDefined(),
    );
    expect(screen.getByText('401 Unauthorized')).toBeDefined();
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeDefined();
  });
});

function emptyMeta(total: number) {
  return { page: 1, pageSize: 20, total, totalPages: total > 0 ? 1 : 0 };
}

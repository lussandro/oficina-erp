import { getJson, postJsonWithToken, type ListResponse } from './api';

/** Peça no seletor de movimento. Só o que a tela usa do `Product`. */
export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

/** Reusa `GET /products` (Épico 6) em vez de inventar rota de autocomplete. */
export function listProductOptions(token: string | null): Promise<ListResponse<ProductOption>> {
  return getJson('/products?pageSize=100&active=true', token);
}

/** Espelha `StockMovementType` do backend (prisma/schema.prisma). */
export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'CONSUMO' | 'DEVOLUCAO';

/** Tipos que `POST /stock/movements` aceita. `AJUSTE` tem rota própria. */
export const MOVEMENT_TYPES: MovementType[] = ['ENTRADA', 'SAIDA', 'CONSUMO', 'DEVOLUCAO'];

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  CONSUMO: 'Consumo em OS',
  DEVOLUCAO: 'Devolução',
};

/** Mesmo mapeamento de tom do `Badge`. Entrada/devolução somam ao saldo. */
export const MOVEMENT_TONE: Record<MovementType, 'success' | 'danger' | 'warning'> = {
  ENTRADA: 'success',
  DEVOLUCAO: 'success',
  SAIDA: 'danger',
  CONSUMO: 'danger',
  AJUSTE: 'warning',
};

export interface Movement {
  id: string;
  type: MovementType;
  /** Assinado: negativo é baixa. O tipo já diz o sinal; o número é o efeito. */
  quantity: number;
  unitCost: string | null;
  resultingQty: number;
  reason: string | null;
  documentRef: string | null;
  createdAt: string;
  product: { id: string; sku: string; name: string; unit: string };
}

export interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stockQty: number;
  minStockQty: number;
}

export interface CreateMovementInput {
  productId: string;
  type: MovementType;
  quantity: number;
  unitCost?: string;
  reason?: string;
  documentRef?: string;
}

export function listMovements(
  token: string | null,
  params: { productId?: string; type?: MovementType; page?: number } = {},
): Promise<ListResponse<Movement>> {
  const query = new URLSearchParams();
  if (params.productId) query.set('productId', params.productId);
  if (params.type) query.set('type', params.type);
  if (params.page) query.set('page', String(params.page));
  return getJson(`/stock/movements?${query}`, token);
}

export function listLowStock(token: string | null): Promise<ListResponse<LowStockProduct>> {
  return getJson('/stock/low', token);
}

export function createMovement(
  token: string | null,
  input: CreateMovementInput,
): Promise<Movement> {
  return postJsonWithToken('/stock/movements', input, token);
}

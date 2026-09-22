'use client';

import { PackageMinus, PackagePlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader, CardTitle, StatCard } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { Select } from '@/components/Select';
import { getToken } from '@/lib/session';
import {
  createMovement,
  listLowStock,
  listMovements,
  listProductOptions,
  MOVEMENT_LABEL,
  MOVEMENT_TONE,
  MOVEMENT_TYPES,
  type LowStockProduct,
  type Movement,
  type MovementType,
  type ProductOption,
} from '@/lib/stock';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Estoque: o extrato de movimentos e o que está abaixo do mínimo.
 *
 * Movimento é append-only — a tela só lê e registra. Não há editar nem apagar:
 * corrigir saldo é registrar um ajuste, e isso é decisão do backend, não um
 * botão escondido aqui.
 */
export default function EstoquePage() {
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [low, setLow] = useState<LowStockProduct[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // O estado de carregando é reposto aqui, no manipulador do evento, e não
  // dentro do efeito: `setState` síncrono em efeito dispara render em cascata.
  const reload = useCallback(() => {
    setState('loading');
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Lido no efeito, não no render: `localStorage` não existe no servidor, e
    // ler no render faria a primeira passada buscar sem token.
    const token = getToken();

    // As listas são independentes: uma falhar não deve esconder a outra. O
    // saldo por peça continua vindo do produto (Épico 6) — o preço não.
    Promise.allSettled([
      listMovements(token),
      listLowStock(token),
      listProductOptions(token),
    ]).then(([movementsResult, lowResult, productsResult]) => {
      if (cancelled) return;

      if (movementsResult.status === 'fulfilled') {
        setMovements(movementsResult.value.data);
      }
      if (lowResult.status === 'fulfilled') {
        setLow(lowResult.value.data);
      }
      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value.data);
      }

      const failure = [movementsResult, lowResult, productsResult].find(
        (result) => result.status === 'rejected',
      );
      if (failure?.status === 'rejected') {
        setError(
          failure.reason instanceof Error
            ? failure.reason.message
            : String(failure.reason),
        );
        setState('error');
        return;
      }
      setState('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 bg-canvas px-4 py-8">
      <PageHeader
        title="Estoque"
        description="Entradas, saídas, consumo em OS e devoluções — com quem registrou e quando."
      />

      {state === 'loading' && <LoadingState message="Carregando os movimentos de estoque…" />}

      {state === 'error' && (
        <ErrorState
          title="Não foi possível carregar o estoque"
          message={error ?? 'Erro desconhecido'}
          onRetry={reload}
        />
      )}

      {state === 'ready' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Movimentos registrados"
              value={movements.length}
              hint="Últimos lançamentos, mais recentes primeiro"
            />
            <StatCard
              label="Abaixo do mínimo"
              value={low.length}
              hint={low.length > 0 ? 'Reposição pendente' : 'Nenhum item em falta'}
            />
          </div>

          <MovementForm products={products} onCreated={reload} />

          <Card>
            <CardHeader>
              <CardTitle>Movimentos</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {movements.length === 0 ? (
                <EmptyState
                  title="Nenhum movimento ainda"
                  description="Registre a primeira entrada para o saldo das peças sair de zero."
                />
              ) : (
                <MovementTable movements={movements} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Peças abaixo do mínimo</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {low.length === 0 ? (
                <EmptyState
                  title="Nenhuma peça abaixo do mínimo"
                  description="Toda peça com mínimo configurado está com saldo suficiente."
                />
              ) : (
                <LowStockTable products={low} />
              )}
            </CardBody>
          </Card>
        </>
      )}
    </main>
  );
}

function MovementTable({ movements }: { movements: Movement[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-sunken text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Data</th>
            <th className="px-4 py-2 font-medium">Peça</th>
            <th className="px-4 py-2 font-medium">Tipo</th>
            <th className="px-4 py-2 text-right font-medium">Qtd.</th>
            <th className="px-4 py-2 text-right font-medium">Saldo</th>
            <th className="px-4 py-2 font-medium">Origem</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id} className="border-t border-line">
              <td className="whitespace-nowrap px-4 py-2 text-muted">
                {formatDateTime(movement.createdAt)}
              </td>
              <td className="px-4 py-2">
                <span className="font-medium text-fg">{movement.product.name}</span>
                <span className="ml-2 text-xs text-subtle">{movement.product.sku}</span>
              </td>
              <td className="px-4 py-2">
                <Badge tone={MOVEMENT_TONE[movement.type]}>
                  {MOVEMENT_LABEL[movement.type]}
                </Badge>
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-fg">
                {formatQuantity(movement.quantity, movement.product.unit)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-muted">
                {movement.resultingQty}
              </td>
              <td className="px-4 py-2 text-muted">
                {movement.reason ?? '—'}
                {movement.documentRef && (
                  <span className="ml-1 text-xs text-subtle">{movement.documentRef}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowStockTable({ products }: { products: LowStockProduct[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-sunken text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Peça</th>
            <th className="px-4 py-2 text-right font-medium">Saldo</th>
            <th className="px-4 py-2 text-right font-medium">Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-line">
              <td className="px-4 py-2">
                <span className="font-medium text-fg">{product.name}</span>
                <span className="ml-2 text-xs text-subtle">{product.sku}</span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-danger">
                {formatQuantity(product.stockQty, product.unit)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-muted">
                {product.minStockQty}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Registro de movimento. O saldo nunca é digitado: o usuário escolhe a peça e o
 * tipo, e o backend calcula o resultado dentro da transação.
 */
function MovementForm({
  products,
  onCreated,
}: {
  products: ProductOption[];
  onCreated: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<MovementType>('ENTRADA');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setSaving(true);

    try {
      const movement = await createMovement(getToken(), {
        productId,
        type,
        quantity: Number(quantity),
        ...(reason ? { reason } : {}),
      });
      setSaved(
        `${MOVEMENT_LABEL[movement.type]} registrada: ${movement.product.name} agora com ${movement.resultingQty} ${movement.product.unit}.`,
      );
      setQuantity('1');
      setReason('');
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar movimento</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorState title="Não foi possível registrar" message={error} />}
          {saved && (
            <p role="status" className="rounded-md bg-success-soft px-4 py-2 text-sm text-success">
              {saved}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field htmlFor="productId" label="Peça" required>
              <Select
                id="productId"
                name="productId"
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="" disabled>
                  Selecione a peça
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="type" label="Tipo" required>
              <Select
                id="type"
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
              >
                {MOVEMENT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {MOVEMENT_LABEL[option]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field htmlFor="quantity" label="Quantidade" required>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                step={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
          </div>

          <Field htmlFor="reason" label="Motivo / origem" hint="Ex.: NF 1234, contagem de balcão">
            <Input
              id="reason"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <Button
            type="submit"
            loading={saving}
            icon={
              type === 'ENTRADA' ? (
                <PackagePlus className="size-4" aria-hidden="true" />
              ) : (
                <PackageMinus className="size-4" aria-hidden="true" />
              )
            }
          >
            Registrar
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

/** Sinal explícito: "-3 UN" lê melhor que "3" numa coluna que já tem negativos. */
function formatQuantity(quantity: number, unit: string): string {
  const sign = quantity > 0 ? '+' : '';
  return `${sign}${quantity} ${unit}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

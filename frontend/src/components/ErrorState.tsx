import { AlertCircle, RotateCcw } from 'lucide-react';

import { Button } from './Button';

export interface ErrorStateProps {
  /**
   * O texto real do erro, como veio da fonte. Nunca "falha na operação":
   * mensagem genérica esconde a causa de quem precisa agir.
   */
  message: string;
  /** Título curto. Padrão: "Não foi possível carregar". */
  title?: string;
  /** Reexecuta a operação que falhou. Sem isto o erro vira beco sem saída. */
  onRetry?: () => void;
  className?: string;
}

/** Falha ao carregar ou ao salvar. Mostra a causa e oferece a saída. */
export function ErrorState({
  message,
  title = 'Não foi possível carregar',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={
        'flex flex-col items-start gap-3 rounded-lg border border-danger bg-danger-soft px-6 py-5 ' +
        (className ?? '')
      }
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-fg">{title}</p>
          <p className="text-sm text-muted">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
        >
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface SpinnerProps {
  /** Tamanho em passos do Tailwind (`size-4`, `size-6`…). */
  className?: string;
  label?: string;
}

/** Giro de carregamento. Use dentro do estado de carregando da tela. */
export function Spinner({ className, label = 'Carregando' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-hidden="true" />
    </span>
  );
}

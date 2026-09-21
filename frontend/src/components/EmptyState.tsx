import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  /** O que fazer em seguida. "Nenhum registro" sozinho não é estado vazio. */
  description?: string;
  icon?: ReactNode;
  /** A ação que resolve o vazio — normalmente o botão primário da tela. */
  action?: ReactNode;
  className?: string;
}

/** Lista sem resultado. Sempre diga o próximo passo, nunca deixe em branco. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center ' +
        (className ?? '')
      }
    >
      <span className="text-subtle" aria-hidden="true">
        {icon ?? <Inbox className="size-8" />}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

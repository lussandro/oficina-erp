import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** A ação primária. Uma só por tela, destacada das secundárias. */
  action?: ReactNode;
  className?: string;
}

/** Cabeçalho padrão de tela: título, contexto e ação primária. */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={
        'flex flex-wrap items-start justify-between gap-3 pb-2 ' + (className ?? '')
      }
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

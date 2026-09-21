import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `float` eleva (modal, painel sobreposto). `none` achata (dentro de card). */
  elevation?: 'card' | 'float' | 'none';
}

/** Superfície de conteúdo. Agrupa o que pertence ao mesmo assunto. */
export function Card({ elevation = 'card', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface',
        elevation === 'card' && 'shadow-card',
        elevation === 'float' && 'shadow-float',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold text-fg', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3',
        className,
      )}
      {...props}
    />
  );
}

/** Métrica do dashboard: número grande, rótulo pequeno, ícone opcional. */
export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, hint, icon, className }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <span className="text-subtle" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </Card>
  );
}

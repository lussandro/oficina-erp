import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Escolha única. Sempre dentro de um `Field`. */
export function Select({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        'touch-target w-full rounded-md border bg-surface px-3 text-sm text-fg',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

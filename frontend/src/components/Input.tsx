import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Pinta a borda de erro. O texto do erro fica no `Field`. */
  invalid?: boolean;
}

/** Campo de texto. Sempre dentro de um `Field` (que traz label e erro). */
export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'touch-target w-full rounded-md border bg-surface px-3 text-sm text-fg',
        'placeholder:text-subtle',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  );
}

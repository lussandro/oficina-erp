import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** Campo de texto longo. Sempre dentro de um `Field`. */
export function Textarea({ invalid = false, className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg',
        'placeholder:text-subtle',
        'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  );
}

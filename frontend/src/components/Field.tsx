import type { ReactNode } from 'react';

export interface FieldProps {
  /** Precisa casar com o `id` do campo para a label ser associada. */
  htmlFor: string;
  label: string;
  /** Texto de apoio abaixo da label. Não substitui a label. */
  hint?: string;
  /** Erro do campo. Vai junto do campo, nunca só no topo do formulário. */
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Invólucro de um campo: label associada, dica e erro no lugar certo.
 * Use em volta de `Input`, `Textarea` e `Select` — eles não trazem label.
 */
export function Field({ htmlFor, label, hint, error, required, children }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}

      {/* Os ids de dica e erro chegam ao campo por aria-describedby, montado
          pelo consumidor — o campo recebe a prop normalmente. */}
      {children}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

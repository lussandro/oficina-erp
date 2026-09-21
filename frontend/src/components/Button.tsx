import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra o giro e bloqueia o clique. Também desabilita o botão. */
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-fg border border-line-strong hover:bg-surface-sunken',
  ghost: 'text-muted hover:bg-surface-sunken hover:text-fg',
  danger: 'bg-danger text-on-accent hover:opacity-90',
};

/* Altura mínima de 44px em todas as variantes: o botão é usado no celular, no
   balcão, com o polegar. `sm` reduz o padding lateral, não a área de toque. */
const SIZE: Record<ButtonSize, string> = {
  sm: 'touch-target px-3 text-sm gap-1.5',
  md: 'touch-target px-4 text-sm gap-2',
};

/** Ação da tela. Use `primary` para a ação principal — uma por tela. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

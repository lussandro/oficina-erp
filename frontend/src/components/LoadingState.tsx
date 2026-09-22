import { Spinner } from './Spinner';

export interface LoadingStateProps {
  /** Diga o que está carregando, não só "Carregando…". */
  message?: string;
  className?: string;
}

/** Espera de tela inteira. Para espera pontual, use `Spinner` direto. */
export function LoadingState({ message = 'Carregando…', className }: LoadingStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center gap-3 px-6 py-12 ' + (className ?? '')
      }
    >
      <Spinner className="size-6" label={message} />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

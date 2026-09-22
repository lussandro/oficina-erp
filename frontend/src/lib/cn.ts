import { twMerge } from 'tailwind-merge';

/** Junta classes resolvendo conflito do Tailwind: a última vence. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(' '));
}

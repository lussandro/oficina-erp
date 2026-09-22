/**
 * Sessão mínima: guarda o access token para as telas autenticadas chamarem a
 * API. Não é o módulo de sessão definitivo — refresh, expiração e proteção de
 * rota entram no épico de autenticação do frontend. Aqui é só o suficiente
 * para o estoque funcionar ponta a ponta.
 */
const TOKEN_KEY = 'oficina.accessToken';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

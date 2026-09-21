/** Base da API. O backend serve em `/api/v1` (docs/ARCHITECTURE.md). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Erro de uma chamada, com o texto que a fonte de verdade devolveu. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * POST JSON com o texto de erro do backend preservado.
 * A mensagem nunca é resumida para "falha na operação" — quem lê a tela
 * precisa da causa real para agir.
 */
export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

/** Resposta de `POST /auth/login` (docs/API_CONTRACT.md). */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

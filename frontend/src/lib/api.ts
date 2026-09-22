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

/** Envelope de listagem do backend: `{ data, meta }` (ARCHITECTURE.md §6). */
export interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** A mesma tradução de erro do `postJson`, para os verbos de leitura. */
async function toApiError(response: Response): Promise<never> {
  const text = await response.text();
  throw new ApiError(response.status, text || `HTTP ${response.status}`);
}

/** GET autenticado. Sem token explícito o backend responde 401 — e a tela
 *  mostra isso como erro, não como lista vazia. */
export async function getJson<T>(path: string, token: string | null): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!response.ok) {
    await toApiError(response);
  }
  return (await response.json()) as T;
}

/** POST autenticado, usado pelos movimentos de estoque. */
export async function postJsonWithToken<T>(
  path: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await toApiError(response);
  }
  return (await response.json()) as T;
}

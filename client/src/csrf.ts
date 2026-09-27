// CSRF token for state-changing API calls (spec §15.2). Kept in memory only,
// never in localStorage/sessionStorage (SEC-05); refreshed from login, /auth/me
// and change-password responses.
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null | undefined): void {
  csrfToken = token ?? null;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (SAFE_METHODS.has(method) || !csrfToken) return fetch(input, init);
  const headers = new Headers(init.headers);
  headers.set('X-CSRF-Token', csrfToken);
  return fetch(input, { ...init, headers });
}

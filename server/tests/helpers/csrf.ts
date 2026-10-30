import { csrfTokenFor, COOKIE_NAME } from '../../src/auth.js';

// Derives the CSRF header value for a Set-Cookie/Cookie string, exactly as the
// client receives it from /api/auth/login or /api/auth/me.
export function csrfFor(cookie: string): string {
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? csrfTokenFor(match[1]) : '';
}

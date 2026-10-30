import { describe, it, expect, vi, afterEach } from 'vitest';
import { csrfFetch, setCsrfToken } from '../../src/csrf';

describe('CSRF client handling (SEC-05, SEC-16)', () => {
  afterEach(() => {
    setCsrfToken(null);
    vi.restoreAllMocks();
  });

  it('attaches X-CSRF-Token only to state-changing requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    setCsrfToken('abc123');

    await csrfFetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    await csrfFetch('/api/tickets');

    const postHeaders = new Headers(fetchMock.mock.calls[0][1]!.headers);
    expect(postHeaders.get('X-CSRF-Token')).toBe('abc123');
    expect(postHeaders.get('Content-Type')).toBe('application/json');
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('X-CSRF-Token')).toBeNull();
  });

  it('keeps the token in memory only (never in web storage)', () => {
    setCsrfToken('memory-only-token');
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(stored).not.toContain('memory-only-token');
  });
});

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { COOKIE_NAME } from '../../src/auth.js';
import { csrfFor } from '../helpers/csrf.js';

const prisma = getPrisma();
const PASSWORD = 'Password123!';
const CLIENT_ORIGIN = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { res, cookie: res.headers['set-cookie']?.[0] ?? '' };
}

function rawToken(cookie: string): string {
  return cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1] ?? '';
}

describe('Security Tests (Lab 3 SEC-01..03, SEC-13..16)', () => {
  let reqCookie: string;
  let adminCookie: string;
  let ownTicketId: number;

  beforeAll(async () => {
    reqCookie = (await login('requester1@toktickit.com')).cookie;
    adminCookie = (await login('admin@toktickit.com')).cookie;
    const req1 = await prisma.user.findUniqueOrThrow({ where: { email: 'requester1@toktickit.com' } });
    const ticket = await prisma.ticket.findFirstOrThrow({ where: { requesterId: req1.id } });
    ownTicketId = ticket.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const commentCount = () => prisma.publicComment.count({ where: { ticketId: ownTicketId } });

  it('SEC-01: password hashes are never returned by login, /auth/me, or the admin user list', async () => {
    const { res: loginRes } = await login('staff1@toktickit.com');
    const me = await request(app).get('/api/auth/me').set('Cookie', reqCookie);
    const users = await request(app).get('/api/admin/users').set('Cookie', adminCookie);

    expect(users.status).toBe(200);
    for (const body of [loginRes.body, me.body, users.body]) {
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|\$argon2/);
    }
  });

  it('SEC-02: raw passwords are never written to logs, even when login fails', async () => {
    const logged: string[] = [];
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => { logged.push(args.map(String).join(' ')); });
    }
    const secret = 'Unlogged#Secret99';
    await request(app).post('/api/auth/login').send({ email: 'requester1@toktickit.com', password: secret });
    await request(app).post('/api/auth/login').send({ email: 'nobody@toktickit.com', password: secret });

    expect(logged.join('\n')).not.toContain(secret);
  });

  it('SEC-03: the session token only travels in the HttpOnly cookie, never in a JSON body', async () => {
    const { res, cookie } = await login('requester2@toktickit.com');
    const token = rawToken(cookie);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);

    expect(token).toHaveLength(64);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toContain(token);
    expect(JSON.stringify(me.body)).not.toContain(token);
    // The CSRF token is derived from, but different from, the session token.
    expect(res.body.csrfToken).toBe(csrfFor(cookie));
    expect(res.body.csrfToken).not.toBe(token);
  });

  it('SEC-13: mutating request without a CSRF token is rejected with 403 and nothing is persisted', async () => {
    const before = await commentCount();
    const res = await request(app)
      .post(`/api/tickets/${ownTicketId}/public-comments`)
      .set('Cookie', reqCookie)
      .send({ content: 'SEC-13 should not be stored' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
    expect(await commentCount()).toBe(before);
  });

  it('SEC-14: mutating request with a forged CSRF token (or another session\'s token) is rejected with 403', async () => {
    const before = await commentCount();
    const forged = await request(app)
      .post(`/api/tickets/${ownTicketId}/public-comments`)
      .set('Cookie', reqCookie)
      .set('X-CSRF-Token', 'f'.repeat(64))
      .send({ content: 'SEC-14 forged' });
    const otherSession = await request(app)
      .post(`/api/tickets/${ownTicketId}/public-comments`)
      .set('Cookie', reqCookie)
      .set('X-CSRF-Token', csrfFor(adminCookie))
      .send({ content: 'SEC-14 other session' });

    expect(forged.status).toBe(403);
    expect(otherSession.status).toBe(403);
    expect(otherSession.body.error.code).toBe('CSRF_TOKEN_INVALID');
    expect(await commentCount()).toBe(before);
  });

  it('SEC-15: cross-origin mutating request is rejected with 403 even with a valid token', async () => {
    const before = await commentCount();
    const res = await request(app)
      .post(`/api/tickets/${ownTicketId}/public-comments`)
      .set('Origin', 'https://evil.example.com')
      .set('Cookie', reqCookie)
      .set('X-CSRF-Token', csrfFor(reqCookie))
      .send({ content: 'SEC-15 cross-origin' });
    const crossOriginLogin = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example.com')
      .send({ email: 'requester1@toktickit.com', password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');
    expect(crossOriginLogin.status).toBe(403);
    expect(await commentCount()).toBe(before);
  });

  it('SEC-16: same-origin request with a valid CSRF token is processed and persisted', async () => {
    const before = await commentCount();
    const me = await request(app).get('/api/auth/me').set('Cookie', reqCookie);
    const res = await request(app)
      .post(`/api/tickets/${ownTicketId}/public-comments`)
      .set('Origin', CLIENT_ORIGIN)
      .set('Cookie', reqCookie)
      .set('X-CSRF-Token', me.body.csrfToken)
      .send({ content: 'SEC-16 accepted comment' });

    expect(res.status).toBe(201);
    expect(await commentCount()).toBe(before + 1);
  });
});

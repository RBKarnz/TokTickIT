import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { hashPassword } from '../../src/auth.js';

const prisma = getPrisma();

const EMAIL = 'requester1@toktickit.com';
const PASSWORD = 'Password123!';
const INACTIVE = 'requester.inactive@toktickit.com';
const FIRSTLOGIN = 'firstlogin@toktickit.com';

async function login(email = EMAIL, password = PASSWORD) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function getCookie(email = EMAIL, password = PASSWORD) {
  const res = await login(email, password);
  return res.headers['set-cookie']?.[0] ?? '';
}

describe('Auth API (Lab 3)', () => {
  afterAll(async () => {
    // Restore firstlogin account for idempotency across test runs
    const defaultHash = await hashPassword('Password123!');
    await prisma.user.updateMany({
      where: { email: FIRSTLOGIN },
      data: { mustChangePassword: true, passwordHash: defaultHash },
    });
  });

  // API-01
  it('API-01: active user login -> 200, safe user fields, session cookie', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.user.role).toBe('REQUESTER');
    expect(res.body.mustChangePassword).toBe(false);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
    // Cookie token must not be leaked into JSON body
    expect(JSON.stringify(res.body)).not.toContain('session_token');
  });

  // API-02 & API-03
  it('API-02 & API-03: wrong password and unknown email return identical safe error', async () => {
    const [wrongPwd, unknown] = await Promise.all([
      login(EMAIL, 'WrongPassword1!'),
      login('nonexistent@toktickit.com', 'WrongPassword1!'),
    ]);
    expect(wrongPwd.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPwd.body.error.message).toBe(unknown.body.error.message); // non-enumeration
  });

  // API-04
  it('API-04: inactive user login -> 401 with safe error message', async () => {
    const res = await login(INACTIVE, PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBeTruthy();
  });

  // API-05
  it('API-05: first-login user -> 200 with mustChangePassword=true', async () => {
    const res = await login(FIRSTLOGIN, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
  });

  // API-06
  it('API-06: restricted session cannot access normal ticket routes -> 403', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app).get('/api/tickets').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  // API-09
  it('API-09: /api/auth/me returns safe user fields — no hash or session token', async () => {
    const cookie = await getCookie();
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(false);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('passwordHash');
    expect(bodyStr).not.toContain('session_token');
    expect(bodyStr).not.toContain('tokenHash');
  });

  // API-10
  it('API-10: logout returns 204 and clears session cookie', async () => {
    const cookie = await getCookie();
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(204);
  });

  // API-11
  it('API-11: session reuse after logout -> 401', async () => {
    const cookie = await getCookie();
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  // API-12
  it('API-12: error responses contain no credentials or secrets', async () => {
    const res = await login(EMAIL, 'WrongPass1!');
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('passwordHash');
    expect(bodyStr).not.toContain('session_token');
    expect(bodyStr).not.toContain('Password123');
  });

  // API-07 / UNIT-01 — password policy validation
  it('API-07: change-password rejects short password (<8 chars)', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'Ab1!', confirmPassword: 'Ab1!' });
    expect(res.status).toBe(422);
  });

  it('API-07: change-password rejects password without uppercase', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'abcdefg1!', confirmPassword: 'abcdefg1!' });
    expect(res.status).toBe(422);
  });

  it('API-07: change-password rejects password without number', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'Abcdefg!!', confirmPassword: 'Abcdefg!!' });
    expect(res.status).toBe(422);
  });

  it('API-07: change-password rejects password without special char', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'Abcdefg1', confirmPassword: 'Abcdefg1' });
    expect(res.status).toBe(422);
  });

  // UNIT-02 — confirmation mismatch
  it('UNIT-02: change-password rejects password confirmation mismatch', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: 'NewPassword123!', confirmPassword: 'DifferentPass1!' });
    expect(res.status).toBe(422);
  });

  // UNIT-03 — same password
  it('UNIT-03: change-password rejects new password identical to current password', async () => {
    const cookie = await getCookie(FIRSTLOGIN, PASSWORD);
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD, confirmPassword: PASSWORD });
    expect(res.status).toBe(422);
  });

  // UNIT-04 — email normalization
  it('UNIT-04: email normalization: padded/uppercase email logs in successfully', async () => {
    const res = await login(`  ${EMAIL.toUpperCase()}  `, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(EMAIL); // stored canonical lowercase email
  });

  // UNIT-05 — role validation
  it('UNIT-05: login response contains valid Lab 3 role', async () => {
    const res = await login('staff1@toktickit.com', PASSWORD);
    expect(res.status).toBe(200);
    expect(['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']).toContain(res.body.user.role);
  });

  // UNIT-06 — safe login error mapping
  it('UNIT-06: bad password, unknown email, inactive account map to same 401 safe message', async () => {
    const [a, b, c] = await Promise.all([
      login(EMAIL, 'WrongPass1!'),
      login('nobody@toktickit.com', 'WrongPass1!'),
      login(INACTIVE, PASSWORD),
    ]);
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(c.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
    expect(a.body.error.message).toBe(c.body.error.message);
  });

  // UNIT-18 — revoked session
  it('UNIT-18: revoked session immediately returns 401', async () => {
    const cookie = await getCookie();
    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  // SEC-04 — Session cookie security attributes
  it('SEC-04: session cookie has required security attributes (HttpOnly, SameSite=Lax, Path=/)', async () => {
    const res = await login();
    const cookieHeader = res.headers['set-cookie']?.[0] || '';
    expect(cookieHeader).toContain('session_token=');
    expect(cookieHeader).toMatch(/httponly/i);
    expect(cookieHeader).toMatch(/samesite=lax/i);
    expect(cookieHeader).toMatch(/path=\//i);
  });

  // UNIT-01 — boundary cases (7 rejected, 8 accepted, 128 accepted, 129 rejected)
  it('UNIT-01: password policy boundary: 7 rejected, 8 accepted, 128 accepted, 129 rejected', async () => {
    const { validatePasswordPolicy } = await import('../../src/auth.js');
    // 7 chars -> rejected
    expect(validatePasswordPolicy('Abc1!ef')).toBe('Password must be 8–128 characters.');
    // 8 chars -> accepted
    expect(validatePasswordPolicy('Abc1!efg')).toBeNull();
    // 128 chars -> accepted
    const pass128 = 'Abc1!' + 'x'.repeat(123);
    expect(pass128.length).toBe(128);
    expect(validatePasswordPolicy(pass128)).toBeNull();
    // 129 chars -> rejected
    const pass129 = 'Abc1!' + 'x'.repeat(124);
    expect(pass129.length).toBe(129);
    expect(validatePasswordPolicy(pass129)).toBe('Password must be 8–128 characters.');
  });

  // UNIT-17 — Session expiry logic (8-hour idle timeout & 24-hour absolute timeout)
  it('UNIT-17: session expires after 8-hour idle timeout', async () => {
    const cookie = await getCookie();
    const tokenMatch = cookie.match(/session_token=([^;]+)/);
    const token = tokenMatch![1];
    const { hashToken } = await import('../../src/auth.js');
    const tokenHash = hashToken(token);

    // Set lastSeenAt to 9 hours ago (idle timeout)
    const nineHoursAgo = new Date(Date.now() - 9 * 3600 * 1000);
    await prisma.session.update({
      where: { tokenHash },
      data: { lastSeenAt: nineHoursAgo },
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('UNIT-17: session expires after 24-hour absolute timeout', async () => {
    const cookie = await getCookie();
    const tokenMatch = cookie.match(/session_token=([^;]+)/);
    const token = tokenMatch![1];
    const { hashToken } = await import('../../src/auth.js');
    const tokenHash = hashToken(token);

    // Set expiresAt to 1 minute in past
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    await prisma.session.update({
      where: { tokenHash },
      data: { expiresAt: oneMinuteAgo },
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  // Session Rotation on change-password
  it('API-08 / Session Rotation: change-password rotates session token, revokes old session, issues new cookie', async () => {
    const loginRes = await login(FIRSTLOGIN, PASSWORD);
    const oldCookie = loginRes.headers['set-cookie'][0];
    const oldToken = oldCookie.match(/session_token=([^;]+)/)![1];

    const NEW_PASS = 'BrandNewSecretPass99!';
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', oldCookie)
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASS, confirmPassword: NEW_PASS });
    expect(changeRes.status).toBe(200);

    // New cookie issued
    const newCookie = changeRes.headers['set-cookie']?.[0];
    expect(newCookie).toBeDefined();
    const newToken = newCookie.match(/session_token=([^;]+)/)![1];
    expect(newToken).not.toBe(oldToken);

    // Old session revoked -> 401
    const oldRes = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
    expect(oldRes.status).toBe(401);

    // New session active -> 200 and mustChangePassword = false
    const newRes = await request(app).get('/api/auth/me').set('Cookie', newCookie);
    expect(newRes.status).toBe(200);
    expect(newRes.body.user.mustChangePassword).toBe(false);

    // Now permitted to access normal ticket routes with new session
    const ticketsRes = await request(app).get('/api/tickets').set('Cookie', newCookie);
    expect(ticketsRes.status).toBe(200);
  });
});

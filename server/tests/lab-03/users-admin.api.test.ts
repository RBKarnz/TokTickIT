import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import * as argon2 from 'argon2';

const prisma = getPrisma();

describe('Administrator User Management API (Lab 3)', () => {
  let adminCookie: string;
  let adminUser: any;
  let staffCookie: string;
  let requesterCookie: string;

  async function cleanupEphemeralUsers() {
    await prisma.session.deleteMany({
      where: {
        user: {
          OR: [
            { email: { startsWith: 'created_' } },
            { email: { startsWith: 'target_' } },
            { email: { startsWith: 'pwd_target_' } },
            { email: { startsWith: 'test_' } },
            { email: { startsWith: 'weak_' } },
            { email: { startsWith: 'test-guard' } },
            { email: { startsWith: 'mismatch_' } },
            { email: { startsWith: 'bad_active_' } },
            { email: { startsWith: 'invalid_role_' } },
          ],
        },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: 'created_' } },
          { email: { startsWith: 'target_' } },
          { email: { startsWith: 'pwd_target_' } },
          { email: { startsWith: 'test_' } },
          { email: { startsWith: 'weak_' } },
          { email: { startsWith: 'test-guard' } },
          { email: { startsWith: 'mismatch_' } },
          { email: { startsWith: 'bad_active_' } },
          { email: { startsWith: 'invalid_role_' } },
        ],
      },
    }).catch(() => {});
  }

  beforeAll(async () => {
    await cleanupEphemeralUsers();

    // Ensure default admin exists and has mustChangePassword=false
    const passwordHash = await argon2.hash('Password123!', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    adminUser = await prisma.user.upsert({
      where: { email: 'admin@toktickit.com' },
      update: { mustChangePassword: false, isActive: true, passwordHash },
      create: {
        name: 'Admin User',
        email: 'admin@toktickit.com',
        role: 'ADMINISTRATOR',
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
    });

    const staffUser = await prisma.user.upsert({
      where: { email: 'staff1@toktickit.com' },
      update: { mustChangePassword: false, isActive: true, passwordHash },
      create: {
        name: 'Alice Tech',
        email: 'staff1@toktickit.com',
        role: 'IT_STAFF',
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
    });

    const requesterUser = await prisma.user.upsert({
      where: { email: 'requester1@toktickit.com' },
      update: { mustChangePassword: false, isActive: true, passwordHash },
      create: {
        name: 'Jennifer Anderson',
        email: 'requester1@toktickit.com',
        role: 'REQUESTER',
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
    });

    await prisma.user.upsert({
      where: { email: 'requester2@toktickit.com' },
      update: { mustChangePassword: false, isActive: true, passwordHash },
      create: {
        name: 'Jane Requester',
        email: 'requester2@toktickit.com',
        role: 'REQUESTER',
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
    });

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@toktickit.com', password: 'Password123!' });
    adminCookie = loginAdmin.headers['set-cookie']?.[0] || '';

    const loginStaff = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@toktickit.com', password: 'Password123!' });
    staffCookie = loginStaff.headers['set-cookie']?.[0] || '';

    const loginRequester = await request(app)
      .post('/api/auth/login')
      .send({ email: 'requester1@toktickit.com', password: 'Password123!' });
    requesterCookie = loginRequester.headers['set-cookie']?.[0] || '';
  });

  // -------------------------------------------------------------------------
  // Role Guard / Authorization on ALL Endpoints (AC-15)
  // -------------------------------------------------------------------------
  describe('Role Guards (AC-15)', () => {
    it('API-46a: GET /api/admin/users rejects non-admin with 403', async () => {
      const resStaff = await request(app).get('/api/admin/users').set('Cookie', staffCookie);
      expect(resStaff.status).toBe(403);
      expect(resStaff.body.error.code).toBe('FORBIDDEN');

      const resReq = await request(app).get('/api/admin/users').set('Cookie', requesterCookie);
      expect(resReq.status).toBe(403);
    });

    it('API-46b: POST /api/admin/users rejects non-admin with 403', async () => {
      const payload = {
        name: 'Test',
        email: 'test-guard@example.com',
        role: 'REQUESTER',
        initialPassword: 'Password123!',
        confirmInitialPassword: 'Password123!',
      };

      const resStaff = await request(app).post('/api/admin/users').set('Cookie', staffCookie).send(payload);
      expect(resStaff.status).toBe(403);

      const resReq = await request(app).post('/api/admin/users').set('Cookie', requesterCookie).send(payload);
      expect(resReq.status).toBe(403);
    });

    it('API-46c: PATCH /api/admin/users/:userId rejects non-admin with 403', async () => {
      const resStaff = await request(app).patch(`/api/admin/users/${adminUser.id}`).set('Cookie', staffCookie).send({ name: 'Hacked' });
      expect(resStaff.status).toBe(403);

      const resReq = await request(app).patch(`/api/admin/users/${adminUser.id}`).set('Cookie', requesterCookie).send({ name: 'Hacked' });
      expect(resReq.status).toBe(403);
    });

    it('API-46d: POST /api/admin/users/:userId/set-initial-password rejects non-admin with 403', async () => {
      const payload = { initialPassword: 'Password123!', confirmInitialPassword: 'Password123!' };
      const resStaff = await request(app).post(`/api/admin/users/${adminUser.id}/set-initial-password`).set('Cookie', staffCookie).send(payload);
      expect(resStaff.status).toBe(403);

      const resReq = await request(app).post(`/api/admin/users/${adminUser.id}/set-initial-password`).set('Cookie', requesterCookie).send(payload);
      expect(resReq.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // User List & Filtering (AC-16)
  // -------------------------------------------------------------------------
  describe('GET /api/admin/users', () => {
    it('API-47: Admin lists users returning safe fields without password hashes', async () => {
      const res = await request(app).get('/api/admin/users').set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);

      const first = res.body.items[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('email');
      expect(first).toHaveProperty('role');
      expect(first).toHaveProperty('isActive');
      expect(first).not.toHaveProperty('passwordHash');
      expect(first).not.toHaveProperty('sessions');
    });

    it('API-48: Search by name returns matching records', async () => {
      const res = await request(app).get('/api/admin/users?search=Alice').set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.items.every((u: any) => u.name.toLowerCase().includes('alice'))).toBe(true);
    });

    it('API-49: Search by email returns matching records', async () => {
      const res = await request(app).get('/api/admin/users?search=staff1@toktickit.com').set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].email).toBe('staff1@toktickit.com');
    });

    it('API-50: Role filter returns only matching records', async () => {
      const res = await request(app).get('/api/admin/users?role=IT_STAFF').set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((u: any) => u.role === 'IT_STAFF')).toBe(true);
    });

    it('rejects invalid role query parameter with 400 Bad Request', async () => {
      const res = await request(app).get('/api/admin/users?role=INVALID_ROLE').set('Cookie', adminCookie);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // Create User (AC-16 & AC-17)
  // -------------------------------------------------------------------------
  describe('POST /api/admin/users', () => {
    let testUserEmail: string;

    it('API-51: creates user with mustChangePassword=true', async () => {
      testUserEmail = `created_${Date.now()}@toktickit.com`;
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Created Test User',
          email: testUserEmail,
          role: 'REQUESTER',
          isActive: true,
          initialPassword: 'TempPassword123!',
          confirmInitialPassword: 'TempPassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Created Test User');
      expect(res.body.user.email).toBe(testUserEmail.toLowerCase());
      expect(res.body.user.role).toBe('REQUESTER');
      expect(res.body.user.isActive).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('API-52: rejects duplicate email (with case/whitespace variations) with 409 Conflict', async () => {
      const duplicateRes = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Duplicate User',
          email: `  ${testUserEmail.toUpperCase()}  `,
          role: 'IT_STAFF',
          initialPassword: 'TempPassword123!',
          confirmInitialPassword: 'TempPassword123!',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('CONFLICT');
    });

    it('API-53: rejects invalid role with 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Invalid Role User',
          email: `invalid_role_${Date.now()}@toktickit.com`,
          role: 'SUPER_ADMIN',
          initialPassword: 'TempPassword123!',
          confirmInitialPassword: 'TempPassword123!',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-boolean isActive with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Bad Active User',
          email: `bad_active_${Date.now()}@toktickit.com`,
          role: 'REQUESTER',
          isActive: 'false', // string instead of boolean
          initialPassword: 'TempPassword123!',
          confirmInitialPassword: 'TempPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid email format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Bad Email User',
          email: 'not-an-email',
          role: 'REQUESTER',
          initialPassword: 'TempPassword123!',
          confirmInitialPassword: 'TempPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/invalid email/i);
    });

    it('rejects password mismatch with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Mismatch User',
          email: `mismatch_${Date.now()}@toktickit.com`,
          role: 'REQUESTER',
          initialPassword: 'Password123!',
          confirmInitialPassword: 'Password999!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/passwords do not match/i);
    });

    it('rejects weak initial password with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Weak Password User',
          email: `weak_${Date.now()}@toktickit.com`,
          role: 'REQUESTER',
          initialPassword: 'weak',
          confirmInitialPassword: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // -------------------------------------------------------------------------
  // Edit User (AC-16 & AC-18)
  // -------------------------------------------------------------------------
  describe('PATCH /api/admin/users/:userId', () => {
    let targetUser: any;

    beforeAll(async () => {
      const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });
      targetUser = await prisma.user.create({
        data: {
          name: 'Edit Target User',
          email: `target_${Date.now()}@toktickit.com`,
          role: 'REQUESTER',
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      });
    });

    it('API-54: edits basic account fields successfully', async () => {
      const updatedName = 'Updated Target Name';
      const res = await request(app)
        .patch(`/api/admin/users/${targetUser.id}`)
        .set('Cookie', adminCookie)
        .send({
          name: updatedName,
          role: 'IT_STAFF',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe(updatedName);
      expect(res.body.user.role).toBe('IT_STAFF');
    });

    it('rejects empty PATCH payload with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUser.id}`)
        .set('Cookie', adminCookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-boolean isActive in PATCH with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${targetUser.id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: 'false' });

      expect(res.status).toBe(400);
    });

    it('API-55: rejects self-deactivation with 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/cannot deactivate their own account/i);

      // Verify admin remains active
      const refreshedAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(refreshedAdmin?.isActive).toBe(true);
    });

    it('API-56: rejects deactivation of last active Administrator with 409 Conflict', async () => {
      // Ensure only 1 active admin in system
      await prisma.user.updateMany({
        where: { role: 'ADMINISTRATOR', id: { not: adminUser.id } },
        data: { isActive: false },
      });

      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false });

      expect(res.status).toBe(409);
    });

    it('API-56b: rejects role demotion of last active Administrator with 409 Conflict', async () => {
      // Ensure only 1 active admin in system
      await prisma.user.updateMany({
        where: { role: 'ADMINISTRATOR', id: { not: adminUser.id } },
        data: { isActive: false },
      });

      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', adminCookie)
        .send({ role: 'IT_STAFF' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/cannot deactivate or change the role of the last active administrator/i);

      // Verify admin role remains ADMINISTRATOR
      const refreshedAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(refreshedAdmin?.role).toBe('ADMINISTRATOR');
    });

    it('API-57 / SEC-12: deactivating another user revokes their active sessions', async () => {
      // Login as target user to establish a session
      const targetLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: targetUser.email, password: 'Password123!' });
      const targetCookie = targetLogin.headers['set-cookie']?.[0] || '';

      // Deactivate target user via Admin
      const deactRes = await request(app)
        .patch(`/api/admin/users/${targetUser.id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false });
      expect(deactRes.status).toBe(200);

      // Target user's session should now be rejected (401)
      const testRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', targetCookie);
      expect(testRes.status).toBe(401);
    });

    it('returns 404 for nonexistent user ID on PATCH', async () => {
      const res = await request(app)
        .patch('/api/admin/users/999999')
        .set('Cookie', adminCookie)
        .send({ name: 'Nonexistent' });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // Set Initial Password (AC-19 & SEC-12)
  // -------------------------------------------------------------------------
  describe('POST /api/admin/users/:userId/set-initial-password', () => {
    let targetUser: any;

    beforeAll(async () => {
      const passwordHash = await argon2.hash('OldPassword123!', { type: argon2.argon2id });
      targetUser = await prisma.user.create({
        data: {
          name: 'Password Reset Target',
          email: `pwd_target_${Date.now()}@toktickit.com`,
          role: 'REQUESTER',
          isActive: true,
          mustChangePassword: false,
          passwordHash,
        },
      });
    });

    it('API-58, API-59, API-60: sets new initial password, forces password change, and revokes prior sessions', async () => {
      // Login with old password
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: targetUser.email, password: 'OldPassword123!' });
      const oldCookie = oldLogin.headers['set-cookie']?.[0] || '';

      // Admin sets new initial password
      const resetRes = await request(app)
        .post(`/api/admin/users/${targetUser.id}/set-initial-password`)
        .set('Cookie', adminCookie)
        .send({
          initialPassword: 'NewInitialPassword123!',
          confirmInitialPassword: 'NewInitialPassword123!',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.user.mustChangePassword).toBe(true);

      // Prior session is revoked (API-60 / SEC-12)
      const oldSessionRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', oldCookie);
      expect(oldSessionRes.status).toBe(401);

      // Old password no longer works
      const failLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: targetUser.email, password: 'OldPassword123!' });
      expect(failLogin.status).toBe(401);

      // New initial password works and returns mustChangePassword=true (API-59)
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: targetUser.email, password: 'NewInitialPassword123!' });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.mustChangePassword).toBe(true);
    });

    it('returns 404 for nonexistent user ID on set-initial-password', async () => {
      const res = await request(app)
        .post('/api/admin/users/999999/set-initial-password')
        .set('Cookie', adminCookie)
        .send({
          initialPassword: 'NewInitialPassword123!',
          confirmInitialPassword: 'NewInitialPassword123!',
        });
      expect(res.status).toBe(404);
    });
  });

  afterAll(async () => {
    // Re-activate all administrators so other test suites have active admins
    await prisma.user.updateMany({
      where: { role: 'ADMINISTRATOR' },
      data: { isActive: true },
    });
    await cleanupEphemeralUsers();
  });
});

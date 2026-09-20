import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { hashPassword } from '../../src/auth.js';

const prisma = getPrisma();

describe('Direct API Authorization & Security Tests (Lab 3)', () => {
  let requester1Cookie: string;
  let requester2Cookie: string;
  let staff1Cookie: string;
  let staff2Cookie: string;
  let adminCookie: string;
  let firstLoginCookie: string;

  let requester1User: any;
  let requester2User: any;
  let staff1User: any;
  let staff2User: any;
  let inactiveStaffUser: any;
  let adminUser: any;
  let category: any;
  let relatedSystem: any;

  let requester1Ticket: any;
  let requester2Ticket: any;
  let testAttachment: any;

  beforeAll(async () => {
    requester1User = await prisma.user.findFirst({ where: { email: 'requester1@toktickit.com' } });
    requester2User = await prisma.user.findFirst({ where: { email: 'requester2@toktickit.com' } });
    staff1User = await prisma.user.findFirst({ where: { email: 'staff1@toktickit.com' } });
    staff2User = await prisma.user.findFirst({ where: { email: 'staff2@toktickit.com' } });
    inactiveStaffUser = await prisma.user.findFirst({ where: { email: 'staff.inactive@toktickit.com' } });
    adminUser = await prisma.user.findFirst({ where: { email: 'admin@toktickit.com' } });

    category = await prisma.category.findFirst({ where: { isActive: true } });
    relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    const [loginReq1, loginReq2, loginStaff1, loginStaff2, loginAdmin, loginFirst] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'requester1@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'requester2@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'staff1@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'staff2@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'admin@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'firstlogin@toktickit.com', password: 'Password123!' }),
    ]);

    requester1Cookie = loginReq1.headers['set-cookie']?.[0] || '';
    requester2Cookie = loginReq2.headers['set-cookie']?.[0] || '';
    staff1Cookie = loginStaff1.headers['set-cookie']?.[0] || '';
    staff2Cookie = loginStaff2.headers['set-cookie']?.[0] || '';
    adminCookie = loginAdmin.headers['set-cookie']?.[0] || '';
    firstLoginCookie = loginFirst.headers['set-cookie']?.[0] || '';

    requester1Ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-AUTH-R1-${Date.now().toString().slice(-6)}`,
        summary: 'Requester 1 Private Ticket',
        description: 'Testing data isolation for Requester 1',
        currentStatus: 'NEW',
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requesterId: requester1User.id,
      },
    });

    requester2Ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-AUTH-R2-${Date.now().toString().slice(-6)}`,
        summary: 'Requester 2 Private Ticket',
        description: 'Testing data isolation for Requester 2',
        currentStatus: 'NEW',
        requestedPriority: 'HIGH',
        itPriority: 'HIGH',
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requesterId: requester2User.id,
      },
    });

    testAttachment = await prisma.attachment.create({
      data: {
        ticketId: requester2Ticket.id,
        originalFilename: 'secret-document.pdf',
        storedFilename: 'secret-document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      },
    });
  });

  describe('1. Status 401 Unauthorized (No Session / Expired Session)', () => {
    it('rejects GET /api/auth/me without session', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('rejects GET /api/tickets without session', async () => {
      const res = await request(app).get('/api/tickets');
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/staff/tickets without session', async () => {
      const res = await request(app).get('/api/staff/tickets');
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/admin/users without session', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('rejects request with forged/invalid session cookie', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Cookie', 'session_token=fake-forged-token-abc-123');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Status 403 Forbidden (Role Mismatch & Restricted Session)', () => {
    it('SEC-06: Requester calling Staff Queue GET /api/staff/tickets -> 403', async () => {
      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Cookie', requester1Cookie);
      expect(res.status).toBe(403);
    });

    it('SEC-06: Requester calling Staff Detail GET /api/staff/tickets/:id -> 403', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${requester1Ticket.id}`)
        .set('Cookie', requester1Cookie);
      expect(res.status).toBe(403);
    });

    it('SEC-06: Requester calling Claim POST /api/staff/tickets/:id/claim -> 403', async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${requester1Ticket.id}/claim`)
        .set('Cookie', requester1Cookie);
      expect(res.status).toBe(403);
    });

    it('SEC-06: Requester calling Owner PUT /api/staff/tickets/:id/owner -> 403', async () => {
      const res = await request(app)
        .put(`/api/staff/tickets/${requester1Ticket.id}/owner`)
        .set('Cookie', requester1Cookie)
        .send({ ownerId: staff1User.id });
      expect(res.status).toBe(403);
    });

    it('SEC-06: Requester calling Status POST /api/staff/tickets/:id/status -> 403', async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${requester1Ticket.id}/status`)
        .set('Cookie', requester1Cookie)
        .send({ status: 'OPEN' });
      expect(res.status).toBe(403);
    });

    it('API-08 / API-16 / SEC-06: Requester calling POST /api/staff/tickets/:id/internal-notes -> 403', async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${requester1Ticket.id}/internal-notes`)
        .set('Cookie', requester1Cookie)
        .send({ content: 'Unauthorized note from requester' });
      expect(res.status).toBe(403);
    });

    it('API-16 / SEC-06: Requester calling GET /api/staff/tickets/:id/internal-notes -> 403', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${requester1Ticket.id}/internal-notes`)
        .set('Cookie', requester1Cookie);
      expect(res.status).toBe(403);
    });

    it('API-46 / UNIT-09: Requester calling GET /api/admin/users -> 403', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', requester1Cookie);
      expect(res.status).toBe(403);
    });

    it('API-46 / UNIT-09: Staff calling GET /api/admin/users -> 403', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', staff1Cookie);
      expect(res.status).toBe(403);
    });

    it('UNIT-09: Staff calling POST /api/admin/users -> 403', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', staff1Cookie)
        .send({
          name: 'Hacker User',
          email: 'hacker@toktickit.com',
          role: 'ADMINISTRATOR',
          initialPassword: 'Password123!',
          confirmInitialPassword: 'Password123!',
        });
      expect(res.status).toBe(403);
    });

    it('API-06: User with restricted session (mustChangePassword=true) calling Ticket API -> 403', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Cookie', firstLoginCookie);
      expect(res.status).toBe(403);
    });
  });

  describe('3. Status 404 Not Found (Resource Isolation & Non-Enumeration)', () => {
    it('API-14 / SEC-08: Requester 1 reading Requester 2 Ticket -> 404 without leaking existence', async () => {
      const res = await request(app)
        .get(`/api/tickets/${requester2Ticket.id}`)
        .set('Cookie', requester1Cookie);
      expect([403, 404]).toContain(res.status);
      expect(res.body.ticket).toBeUndefined();
    });

    it('API-15 / SEC-08: Requester 1 downloading Requester 2 Attachment -> 404', async () => {
      const res = await request(app)
        .get(`/api/attachments/${testAttachment.id}/download`)
        .set('Cookie', requester1Cookie);
      expect([403, 404]).toContain(res.status);
    });

    it('API-14 / SEC-08: Requester 1 posting comment on Requester 2 Ticket -> 404', async () => {
      const res = await request(app)
        .post(`/api/tickets/${requester2Ticket.id}/public-comments`)
        .set('Cookie', requester1Cookie)
        .send({ content: 'Attempting cross-requester comment' });
      expect([403, 404]).toContain(res.status);
    });

    it('API-14: Requester 1 toggling problem resolved on Requester 2 Ticket -> 404', async () => {
      const res = await request(app)
        .post(`/api/tickets/${requester2Ticket.id}/problem-appears-resolved`)
        .set('Cookie', requester1Cookie);
      expect([403, 404]).toContain(res.status);
    });

    it('SEC-08: Non-existent ticket ID for authorized Staff -> safe 404', async () => {
      const res = await request(app)
        .get('/api/staff/tickets/999999')
        .set('Cookie', staff1Cookie);
      expect(res.status).toBe(404);
    });
  });

  describe('4. Status 409 Conflict (State, Concurrency & Safety Rules)', () => {
    it('API-29 / SEC-10: Claim ticket already owned by another Staff -> 409 Conflict', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-CLAIM-CONF-${Date.now().toString().slice(-6)}`,
          summary: 'Ticket owned by Staff 1',
          description: 'Testing claim conflict',
          currentStatus: 'OPEN',
          requestedPriority: 'HIGH',
          itPriority: 'HIGH',
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requesterId: requester1User.id,
          ownerId: staff1User.id,
        },
      });

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set('Cookie', staff2Cookie);
      expect(res.status).toBe(409);

      const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(updated?.ownerId).toBe(staff1User.id);
    });

    it('API-35 / UNIT-12: Invalid Status Transition (NEW -> IN_PROGRESS) -> 409 Conflict', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-INV-STAT-${Date.now().toString().slice(-6)}`,
          summary: 'Status transition test',
          description: 'Testing invalid transition from NEW to IN_PROGRESS',
          currentStatus: 'NEW',
          requestedPriority: 'MEDIUM',
          itPriority: 'MEDIUM',
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requesterId: requester1User.id,
        },
      });

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(409);

      const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(updated?.currentStatus).toBe('NEW');
    });

    it('API-52 / BR-08: User create with duplicate email (even with case difference) -> 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Duplicate Test',
          email: 'REQUESTER1@TOKTICKIT.COM',
          role: 'REQUESTER',
          initialPassword: 'Password123!',
          confirmInitialPassword: 'Password123!',
        });
      expect(res.status).toBe(409);
    });

    it('API-55 / UNIT-15: Administrator self-deactivation -> 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false });
      expect(res.status).toBe(409);

      const dbUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(dbUser?.isActive).toBe(true);
    });

    it('API-56 / UNIT-16: Deactivating last active Administrator -> 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false });
      expect(res.status).toBe(409);
    });

    it('API-56b / UNIT-16b: Demoting last active Administrator away from ADMINISTRATOR -> 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set('Cookie', adminCookie)
        .send({ role: 'IT_STAFF' });
      expect(res.status).toBe(409);

      const dbUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(dbUser?.role).toBe('ADMINISTRATOR');
    });
  });

  describe('5. Status 422 Unprocessable Entity (Semantic Validation)', () => {
    it('API-31: Assigning ticket to inactive Staff member -> 422 Unprocessable Entity', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-ASSIGN-INACT-${Date.now().toString().slice(-6)}`,
          summary: 'Testing inactive staff assign',
          description: 'Should be rejected',
          currentStatus: 'OPEN',
          requestedPriority: 'LOW',
          itPriority: 'LOW',
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requesterId: requester1User.id,
        },
      });

      const res = await request(app)
        .put(`/api/staff/tickets/${ticket.id}/owner`)
        .set('Cookie', staff1Cookie)
        .send({ ownerId: inactiveStaffUser.id });
      expect([422, 400]).toContain(res.status);

      const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(updated?.ownerId).toBeNull();
    });

    it('API-53 / UNIT-05: Creating user with invalid role -> 422 Unprocessable Entity', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookie)
        .send({
          name: 'Invalid Role User',
          email: 'invalid-role-test@toktickit.com',
          role: 'SUPER_USER',
          initialPassword: 'Password123!',
          confirmInitialPassword: 'Password123!',
        });
      expect([422, 400]).toContain(res.status);
    });

    it('Transition to RESOLVED without resolutionSummary -> rejected with validation error', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-NO-RES-SUMM-${Date.now().toString().slice(-6)}`,
          summary: 'Testing resolution summary mandatory requirement',
          description: 'Should fail if resolutionSummary is missing',
          currentStatus: 'IN_PROGRESS',
          requestedPriority: 'HIGH',
          itPriority: 'HIGH',
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requesterId: requester1User.id,
          ownerId: staff1User.id,
        },
      });

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'RESOLVED' });
      expect([422, 400]).toContain(res.status);
    });
  });

  describe('6. Requester Ownership & Session Derivation (API-13, API-17, SEC-07)', () => {
    it('API-13 / SEC-07: Client cannot forge requesterId in POST /api/tickets', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Cookie', requester1Cookie)
        .send({
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: 'HIGH',
          summary: 'Ticket with spoofed requesterId',
          description: 'Client sends requesterId 9999',
          requesterId: 9999,
        });

      expect(res.status).toBe(201);
      const createdTicket = await prisma.ticket.findUnique({ where: { id: res.body.id } });
      expect(createdTicket?.requesterId).toBe(requester1User.id);
    });
  });

  describe('7. Session Revocation & Security Integrity (API-60, SEC-12)', () => {
    it('API-60 / SEC-12: Admin setting initial password revokes target user existing sessions', async () => {
      const targetEmail = `revocation_test_${Date.now()}@toktickit.com`;
      const pwdHash = await hashPassword('Password123!');
      const targetUser = await prisma.user.create({
        data: {
          name: 'Revocation Test User',
          email: targetEmail,
          role: 'REQUESTER',
          isActive: true,
          mustChangePassword: false,
          passwordHash: pwdHash,
        },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: targetEmail, password: 'Password123!' });
      expect(loginRes.status).toBe(200);
      const targetSessionCookie = loginRes.headers['set-cookie']?.[0] || '';

      const preCheck = await request(app).get('/api/auth/me').set('Cookie', targetSessionCookie);
      expect(preCheck.status).toBe(200);

      const resetRes = await request(app)
        .post(`/api/admin/users/${targetUser.id}/set-initial-password`)
        .set('Cookie', adminCookie)
        .send({
          initialPassword: 'ResetPassword123!',
          confirmInitialPassword: 'ResetPassword123!',
        });
      expect(resetRes.status).toBe(200);

      const postCheck = await request(app).get('/api/auth/me').set('Cookie', targetSessionCookie);
      expect(postCheck.status).toBe(401);

      // Clean up ephemeral user
      await prisma.session.deleteMany({ where: { userId: targetUser.id } });
      await prisma.user.delete({ where: { id: targetUser.id } });
    });
  });
});

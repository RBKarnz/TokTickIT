import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('Staff Ticket Detail API (Lab 3)', () => {
  let staff1Cookie: string;
  let staff2Cookie: string;
  let requesterCookie: string;
  let adminCookie: string;

  let staff1User: any;
  let staff2User: any;
  let inactiveStaffUser: any;
  let requesterUser: any;
  let adminUser: any;

  let category: any;
  let relatedSystem: any;

  beforeAll(async () => {
    // 1. Fetch test users
    staff1User = await prisma.user.findFirst({ where: { email: 'staff1@toktickit.com' } });
    staff2User = await prisma.user.findFirst({ where: { email: 'staff2@toktickit.com' } });
    inactiveStaffUser = await prisma.user.findFirst({ where: { email: 'staff.inactive@toktickit.com' } });
    requesterUser = await prisma.user.findFirst({ where: { email: 'requester1@toktickit.com' } });
    adminUser = await prisma.user.findFirst({ where: { email: 'admin@toktickit.com' } });

    category = await prisma.category.findFirst({ where: { isActive: true } });
    relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // 2. Perform logins to acquire cookies
    const [loginStaff1, loginStaff2, loginReq, loginAdmin] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'staff1@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'staff2@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'requester1@toktickit.com', password: 'Password123!' }),
      request(app).post('/api/auth/login').send({ email: 'admin@toktickit.com', password: 'Password123!' }),
    ]);

    staff1Cookie = loginStaff1.headers['set-cookie']?.[0] || '';
    staff2Cookie = loginStaff2.headers['set-cookie']?.[0] || '';
    requesterCookie = loginReq.headers['set-cookie']?.[0] || '';
    adminCookie = loginAdmin.headers['set-cookie']?.[0] || '';
  });

  let ticketSeq = 1;
  const createTestTicket = async (overrides: Partial<any> = {}) => {
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}-${String(ticketSeq++).padStart(4, '0')}`;
    return prisma.ticket.create({
      data: {
        ticketNumber,
        summary: 'Test ticket for staff operations',
        description: 'Detail description for test ticket',
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        requesterId: requesterUser.id,
        requestedPriority: 'MEDIUM',
        itPriority: 'UNASSIGNED',
        currentStatus: 'NEW',
        ownerId: null,
        ...overrides,
      },
    });
  };

  // -------------------------------------------------------------------------
  // GET /api/staff/tickets/:id
  // -------------------------------------------------------------------------
  describe('GET /api/staff/tickets/:id', () => {
    it('returns full ticket details for IT Staff', async () => {
      const ticket = await createTestTicket();
      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set('Cookie', staff1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
      expect(res.body.ticketNumber).toBe(ticket.ticketNumber);
      expect(res.body.category).toBeDefined();
      expect(res.body.requester.email).toBe(requesterUser.email);
    });

    it('returns full ticket details in read-only mode for Administrator', async () => {
      const ticket = await createTestTicket();
      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
    });

    it('rejects Requester with 403 Forbidden', async () => {
      const ticket = await createTestTicket();
      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set('Cookie', requesterCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 Not Found for non-existent ticket', async () => {
      const res = await request(app)
        .get('/api/staff/tickets/99999999')
        .set('Cookie', staff1Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/tickets/:id (Security & Non-Enumeration)
  // -------------------------------------------------------------------------
  describe('GET /api/tickets/:id (General Ticket Route)', () => {
    it('returns 404 Not Found when Requester accesses another users ticket (non-enumeration)', async () => {
      // Create ticket owned by staff2 as requester
      const otherTicket = await createTestTicket({ requesterId: staff2User.id });
      const res = await request(app)
        .get(`/api/tickets/${otherTicket.id}`)
        .set('Cookie', requesterCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('allows Administrator to view ticket on /api/tickets/:id', async () => {
      const ticket = await createTestTicket();
      const res = await request(app)
        .get(`/api/tickets/${ticket.id}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/staff/tickets/:id/claim (AC-09)
  // -------------------------------------------------------------------------
  describe('POST /api/staff/tickets/:id/claim', () => {
    it('API-28: claims unassigned ticket successfully', async () => {
      const ticket = await createTestTicket({ ownerId: null });
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set('Cookie', staff1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.owner.id).toBe(staff1User.id);
      expect(res.body.owner.name).toBe(staff1User.name);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staff1User.id);
    });

    it('API-29: rejects claiming an already-owned ticket with 409 Conflict', async () => {
      const ticket = await createTestTicket({ ownerId: staff1User.id });
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set('Cookie', staff2Cookie);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staff1User.id); // unchanged
    });

    it('rejects claim for non-existent ticket with 404 Not Found', async () => {
      const res = await request(app)
        .post('/api/staff/tickets/99999999/claim')
        .set('Cookie', staff1Cookie);

      expect(res.status).toBe(404);
    });

    it('rejects Administrator and Requester with 403 Forbidden', async () => {
      const ticket = await createTestTicket({ ownerId: null });
      const [adminRes, reqRes] = await Promise.all([
        request(app).post(`/api/staff/tickets/${ticket.id}/claim`).set('Cookie', adminCookie),
        request(app).post(`/api/staff/tickets/${ticket.id}/claim`).set('Cookie', requesterCookie),
      ]);

      expect(adminRes.status).toBe(403);
      expect(reqRes.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /api/staff/tickets/:id/owner (AC-09)
  // -------------------------------------------------------------------------
  describe('PUT /api/staff/tickets/:id/owner', () => {
    it('API-30: assigns/reassigns ticket to active IT Staff successfully', async () => {
      const ticket = await createTestTicket({ ownerId: staff1User.id });
      const res = await request(app)
        .put(`/api/staff/tickets/${ticket.id}/owner`)
        .set('Cookie', staff1Cookie)
        .send({ ownerId: staff2User.id });

      expect(res.status).toBe(200);
      expect(res.body.owner.id).toBe(staff2User.id);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staff2User.id);
    });

    it('supports idempotent no-op reassign to current owner with 200 OK', async () => {
      const ticket = await createTestTicket({ ownerId: staff1User.id });
      const res = await request(app)
        .put(`/api/staff/tickets/${ticket.id}/owner`)
        .set('Cookie', staff1Cookie)
        .send({ ownerId: staff1User.id });

      expect(res.status).toBe(200);
      expect(res.body.owner.id).toBe(staff1User.id);
    });

    it('API-31: rejects assignment to inactive Staff with 400 Bad Request', async () => {
      const ticket = await createTestTicket({ ownerId: staff1User.id });
      const res = await request(app)
        .put(`/api/staff/tickets/${ticket.id}/owner`)
        .set('Cookie', staff1Cookie)
        .send({ ownerId: inactiveStaffUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staff1User.id); // unchanged
    });

    it('rejects assignment to Administrator or Requester with 400 Bad Request', async () => {
      const ticket = await createTestTicket({ ownerId: staff1User.id });
      const [adminTargetRes, reqTargetRes] = await Promise.all([
        request(app).put(`/api/staff/tickets/${ticket.id}/owner`).set('Cookie', staff1Cookie).send({ ownerId: adminUser.id }),
        request(app).put(`/api/staff/tickets/${ticket.id}/owner`).set('Cookie', staff1Cookie).send({ ownerId: requesterUser.id }),
      ]);

      expect(adminTargetRes.status).toBe(400);
      expect(reqTargetRes.status).toBe(400);
    });

    it('rejects assignment for non-existent ticket with 404 Not Found', async () => {
      const res = await request(app)
        .put('/api/staff/tickets/99999999/owner')
        .set('Cookie', staff1Cookie)
        .send({ ownerId: staff2User.id });

      expect(res.status).toBe(404);
    });

    it('rejects Administrator and Requester callers with 403 Forbidden', async () => {
      const ticket = await createTestTicket();
      const [adminRes, reqRes] = await Promise.all([
        request(app).put(`/api/staff/tickets/${ticket.id}/owner`).set('Cookie', adminCookie).send({ ownerId: staff1User.id }),
        request(app).put(`/api/staff/tickets/${ticket.id}/owner`).set('Cookie', requesterCookie).send({ ownerId: staff1User.id }),
      ]);

      expect(adminRes.status).toBe(403);
      expect(reqRes.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/staff/tickets/:id/it-priority (AC-10)
  // -------------------------------------------------------------------------
  describe('PATCH /api/staff/tickets/:id/it-priority', () => {
    it('API-32 & API-33: changes IT Priority and preserves Requested Priority intact', async () => {
      const ticket = await createTestTicket({ requestedPriority: 'LOW', itPriority: 'UNASSIGNED' });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/it-priority`)
        .set('Cookie', staff1Cookie)
        .send({ itPriority: 'CRITICAL' });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe('CRITICAL');
      expect(res.body.requestedPriority).toBe('LOW');

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.itPriority).toBe('CRITICAL');
      expect(dbTicket?.requestedPriority).toBe('LOW'); // unchanged
    });

    it('rejects invalid priority string with 400 Bad Request', async () => {
      const ticket = await createTestTicket();
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/it-priority`)
        .set('Cookie', staff1Cookie)
        .send({ itPriority: 'SUPER_URGENT' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects update on non-existent ticket with 404 Not Found', async () => {
      const res = await request(app)
        .patch('/api/staff/tickets/99999999/it-priority')
        .set('Cookie', staff1Cookie)
        .send({ itPriority: 'HIGH' });

      expect(res.status).toBe(404);
    });

    it('rejects Administrator and Requester with 403 Forbidden', async () => {
      const ticket = await createTestTicket();
      const [adminRes, reqRes] = await Promise.all([
        request(app).patch(`/api/staff/tickets/${ticket.id}/it-priority`).set('Cookie', adminCookie).send({ itPriority: 'HIGH' }),
        request(app).patch(`/api/staff/tickets/${ticket.id}/it-priority`).set('Cookie', requesterCookie).send({ itPriority: 'HIGH' }),
      ]);

      expect(adminRes.status).toBe(403);
      expect(reqRes.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/staff/tickets/:id/status (AC-11)
  // -------------------------------------------------------------------------
  describe('POST /api/staff/tickets/:id/status', () => {
    it('API-34: transitions through allowed matrix states successfully', async () => {
      const ticket = await createTestTicket({ currentStatus: 'NEW' });

      // 1. NEW -> OPEN
      const step1 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Open' });
      expect(step1.status).toBe(200);
      expect(step1.body.currentStatus).toBe('OPEN');

      // 2. OPEN -> IN_PROGRESS
      const step2 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'In Progress' });
      expect(step2.status).toBe(200);
      expect(step2.body.currentStatus).toBe('IN_PROGRESS');

      // 3. IN_PROGRESS -> RESOLVED (with resolutionSummary)
      const step3 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Resolved', resolutionSummary: 'Fixed Ethernet port connection.' });
      expect(step3.status).toBe(200);
      expect(step3.body.currentStatus).toBe('RESOLVED');
      expect(step3.body.resolutionSummary).toBe('Fixed Ethernet port connection.');

      // 4. RESOLVED -> CLOSED
      const step4 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Closed' });
      expect(step4.status).toBe(200);
      expect(step4.body.currentStatus).toBe('CLOSED');

      // 5. CLOSED -> REOPENED
      const step5 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Reopened' });
      expect(step5.status).toBe(200);
      expect(step5.body.currentStatus).toBe('REOPENED');
    });

    it('rejects transitioning to RESOLVED without resolutionSummary with 400 Bad Request', async () => {
      const ticket = await createTestTicket({ currentStatus: 'IN_PROGRESS' });
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Resolved' }); // missing resolutionSummary

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('API-35: rejects forbidden status transitions with 409 Conflict', async () => {
      const ticket = await createTestTicket({ currentStatus: 'NEW' });
      // NEW cannot jump directly to RESOLVED or CLOSED
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Resolved', resolutionSummary: 'Jumped resolution' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects self-transitions (status unchanged) with 409 Conflict', async () => {
      const ticket = await createTestTicket({ currentStatus: 'OPEN' });
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Open' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects transitions from CANCELLED (terminal state) with 409 Conflict', async () => {
      const ticket = await createTestTicket({ currentStatus: 'CANCELLED' });
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff1Cookie)
        .send({ status: 'Open' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('API-36: rejects Requester caller with 403 Forbidden', async () => {
      const ticket = await createTestTicket({ currentStatus: 'NEW' });
      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', requesterCookie)
        .send({ status: 'Open' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // -------------------------------------------------------------------------
  // Administrator & Internal Notes & Users Endpoints
  // -------------------------------------------------------------------------
  describe('Internal Notes & Staff Users Capabilities', () => {
    it('Administrator can create Internal Note via /api/tickets/:id/internal-notes (AC-14)', async () => {
      const ticket = await createTestTicket();
      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/internal-notes`)
        .set('Cookie', adminCookie)
        .send({ content: 'Administrator audit inspection note.' });

      expect(res.status).toBe(201);
      expect(res.body.note.content).toBe('Administrator audit inspection note.');
      expect(res.body.note.author.role).toBe('ADMINISTRATOR');
    });

    it('Alias Parity: note created on /api/tickets/:id/internal-notes is readable on /api/staff/tickets/:id/internal-notes', async () => {
      const ticket = await createTestTicket();
      await request(app)
        .post(`/api/tickets/${ticket.id}/internal-notes`)
        .set('Cookie', staff1Cookie)
        .send({ content: 'Parity testing note' });

      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}/internal-notes`)
        .set('Cookie', staff1Cookie);

      expect(res.status).toBe(200);
      const found = res.body.notes.find((n: any) => n.content === 'Parity testing note');
      expect(found).toBeDefined();
    });

    it('GET /api/staff/users: rejects Requester with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/staff/users')
        .set('Cookie', requesterCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/staff/users: allows Administrator and IT Staff with 200 OK', async () => {
      const [adminRes, staffRes] = await Promise.all([
        request(app).get('/api/staff/users').set('Cookie', adminCookie),
        request(app).get('/api/staff/users').set('Cookie', staff1Cookie),
      ]);

      expect(adminRes.status).toBe(200);
      expect(Array.isArray(adminRes.body.users)).toBe(true);
      expect(adminRes.body.users.every((u: any) => u.id && u.name)).toBe(true);

      expect(staffRes.status).toBe(200);
      expect(Array.isArray(staffRes.body.users)).toBe(true);
    });
  });
});

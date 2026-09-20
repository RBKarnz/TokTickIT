import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

const PASSWORD = 'Password123!';
const STAFF_EMAIL = 'staff1@toktickit.com';
const STAFF2_EMAIL = 'staff2@toktickit.com';
const REQ_EMAIL = 'requester1@toktickit.com';
const ADMIN_EMAIL = 'admin@toktickit.com';

async function getCookie(email: string, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.headers['set-cookie']?.[0] ?? '';
}

describe('IT Staff Ticket Queue API (Lab 3)', () => {
  let staffCookie: string;
  let reqCookie: string;
  let adminCookie: string;
  let staffUser: any;
  let staff2User: any;
  let reqUser: any;
  let category: any;
  let system: any;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    [staffCookie, reqCookie, adminCookie] = await Promise.all([
      getCookie(STAFF_EMAIL),
      getCookie(REQ_EMAIL),
      getCookie(ADMIN_EMAIL),
    ]);

    staffUser = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });
    staff2User = await prisma.user.findUnique({ where: { email: STAFF2_EMAIL } });
    reqUser = await prisma.user.findUnique({ where: { email: REQ_EMAIL } });

    category = await prisma.category.findFirst();
    system = await prisma.relatedSystem.findFirst();

    // Create a deterministic batch of test tickets
    const now = Date.now();
    const ticketsData = [
      {
        ticketNumber: `TKT-QUEUE-1-${now}`,
        summary: 'VPN authentication failure alpha',
        description: 'Detail 1',
        requestedPriority: 'HIGH' as const,
        itPriority: 'CRITICAL' as const,
        currentStatus: 'IN_PROGRESS' as const,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        ownerId: staffUser.id,
        createdAt: new Date(now - 10000),
        updatedAt: new Date(now - 1000),
      },
      {
        ticketNumber: `TKT-QUEUE-2-${now}`,
        summary: 'Printer paper jam in building B',
        description: 'Detail 2',
        requestedPriority: 'LOW' as const,
        itPriority: 'LOW' as const,
        currentStatus: 'OPEN' as const,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        ownerId: null, // Unassigned
        createdAt: new Date(now - 8000),
        updatedAt: new Date(now - 2000),
      },
      {
        ticketNumber: `TKT-QUEUE-3-${now}`,
        summary: 'Network router firmware upgrade required',
        description: 'Detail 3',
        requestedPriority: 'MEDIUM' as const,
        itPriority: 'HIGH' as const,
        currentStatus: 'NEW' as const,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        ownerId: staff2User?.id ?? null,
        createdAt: new Date(now - 6000),
        updatedAt: new Date(now - 3000),
      },
      {
        ticketNumber: `TKT-QUEUE-4-${now}`,
        summary: 'VPN timeout issue beta',
        description: 'Detail 4',
        requestedPriority: 'HIGH' as const,
        itPriority: 'HIGH' as const,
        currentStatus: 'RESOLVED' as const,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        ownerId: staffUser.id,
        createdAt: new Date(now - 4000),
        updatedAt: new Date(now - 4000),
      },
      {
        ticketNumber: `TKT-QUEUE-5-${now}`,
        summary: 'Email client synchronization error',
        description: 'Detail 5',
        requestedPriority: 'MEDIUM' as const,
        itPriority: 'MEDIUM' as const,
        currentStatus: 'CLOSED' as const,
        requesterId: reqUser.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        ownerId: null, // Unassigned
        createdAt: new Date(now - 2000),
        updatedAt: new Date(now - 5000),
      },
    ];

    for (const t of ticketsData) {
      const created = await prisma.ticket.create({ data: t });
      createdTicketIds.push(created.id);
    }
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  describe('API-20: Default Ordering, Pagination, and Data Mapping', () => {
    it('returns default page 1, pageSize 20, and ordered by updatedAt desc', async () => {
      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(20);
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(5);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.items)).toBe(true);

      // Verify updatedAt descending order
      const items = res.body.items;
      for (let i = 0; i < items.length - 1; i++) {
        const d1 = new Date(items[i].updatedAt).getTime();
        const d2 = new Date(items[i + 1].updatedAt).getTime();
        expect(d1).toBeGreaterThanOrEqual(d2);
      }
    });

    it('returns data mapping matching specification (category: string, status: display label)', async () => {
      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      const item = res.body.items.find((x: any) => createdTicketIds.includes(x.id));
      expect(item).toBeDefined();

      // category must be a string, not an object
      expect(typeof item.category).toBe('string');
      expect(item.category).toBe(category.name);

      // status must be human readable display label
      expect(typeof item.status).toBe('string');
      const validLabels = ['New', 'Open', 'In Progress', 'Waiting for Requester', 'Resolved', 'Closed', 'Reopened', 'Cancelled'];
      expect(validLabels).toContain(item.status);

      // owner must be { id, name } or null
      if (item.owner !== null) {
        expect(typeof item.owner.id).toBe('number');
        expect(typeof item.owner.name).toBe('string');
      }
    });
  });

  describe('API-21 & API-22: Server-Driven Search', () => {
    it('API-21: searches by ticketNumber substring', async () => {
      const targetTicket = await prisma.ticket.findUnique({ where: { id: createdTicketIds[0] } });
      const partialNumber = targetTicket!.ticketNumber.slice(0, 15);

      const res = await request(app)
        .get(`/api/staff/tickets?search=${encodeURIComponent(partialNumber)}`)
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.some((t: any) => t.id === targetTicket!.id)).toBe(true);
    });

    it('API-22: searches by summary substring (case-insensitive)', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?search=printer+paper+jam')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => /printer paper jam/i.test(t.summary))).toBe(true);
    });
  });

  describe('API-23: Filters', () => {
    it('filters by status using DB enum', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?status=IN_PROGRESS')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.status === 'In Progress')).toBe(true);
    });

    it('filters by status using display label', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?status=In+Progress')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.status === 'In Progress')).toBe(true);
    });

    it('filters by requestedPriority', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?requestedPriority=LOW')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.requestedPriority === 'LOW')).toBe(true);
    });

    it('filters by itPriority', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?itPriority=CRITICAL')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.itPriority === 'CRITICAL')).toBe(true);
    });

    it('filters by ownership=unassigned', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?ownership=unassigned')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.owner === null)).toBe(true);
    });

    it('filters by ownership=assigned', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?ownership=assigned')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.owner !== null)).toBe(true);
    });

    it('filters by ownerId', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?ownerId=${staffUser.id}`)
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items.every((t: any) => t.owner?.id === staffUser.id)).toBe(true);
    });
  });

  describe('API-24: Sorting', () => {
    it('sorts by createdAt asc with secondary tie-breaker', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?sortBy=createdAt&sortOrder=asc')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      const items = res.body.items;
      for (let i = 0; i < items.length - 1; i++) {
        const t1 = new Date(items[i].createdAt).getTime();
        const t2 = new Date(items[i + 1].createdAt).getTime();
        expect(t1).toBeLessThanOrEqual(t2);
      }
    });

    it('sorts by category asc without error', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?sortBy=category&sortOrder=asc')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('sorts by owner asc with null owners present without crashing', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?sortBy=owner&sortOrder=asc')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('sorts by status asc', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?sortBy=status&sortOrder=asc')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('API-25: Pagination & Empty Result Handling', () => {
    it('returns pageSize=10 metadata correctly', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?pageSize=10')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.pagination.pageSize).toBe(10);
      expect(res.body.items.length).toBeLessThanOrEqual(10);
    });

    it('returns pageSize=50 metadata correctly', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?pageSize=50')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.pagination.pageSize).toBe(50);
    });

    it('returns totalItems=0, totalPages=0 for empty match', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?search=NON_EXISTENT_TICKET_STRING_XYZ_999')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.pagination.totalItems).toBe(0);
      expect(res.body.pagination.totalPages).toBe(0);
    });
  });

  describe('API-26: Invalid Query Parameters Validation (400 BAD_REQUEST)', () => {
    it('rejects duplicate/array search query param with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?search=one&search=two')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid pageSize with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?pageSize=15')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects negative or invalid page with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?page=-1')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid status with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?status=INVALID_STATUS')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid requestedPriority with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?requestedPriority=SUPER_HIGH')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid itPriority with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?itPriority=SUPER_LOW')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid ownership with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?ownership=invalid')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects non-numeric ownerId with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?ownerId=abc')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects unknown sortBy field with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?sortBy=passwordHash')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid sortOrder with 400', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?sortOrder=random')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('API-27 & Authorization Security', () => {
    it('rejects REQUESTER role with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Cookie', reqCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects ADMINISTRATOR role with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/staff/tickets')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/staff/tickets');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/staff/users Endpoint', () => {
    it('returns active IT Staff users for IT Staff caller', async () => {
      const res = await request(app)
        .get('/api/staff/users')
        .set('Cookie', staffCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.users[0]).toHaveProperty('id');
      expect(res.body.users[0]).toHaveProperty('name');
      expect(res.body.users[0]).toHaveProperty('email');
      expect(res.body.users[0]).not.toHaveProperty('passwordHash');
    });

    it('returns active IT Staff users for Administrator caller', async () => {
      const res = await request(app)
        .get('/api/staff/users')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('rejects Requester caller with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/staff/users')
        .set('Cookie', reqCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

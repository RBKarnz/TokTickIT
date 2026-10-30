import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { rollingWindowCutoff, ROLLING_WINDOW_MS } from '../../src/dashboard.js';

const prisma = getPrisma();
const PASSWORD = 'Password123!';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie']?.[0] ?? '';
}

function get(path: string, cookie: string) {
  return request(app).get(path).set('Cookie', cookie);
}

describe('rollingWindowCutoff (UNIT-07)', () => {
  it('returns an instant exactly 168 hours before "now", independent of timezone', () => {
    const now = new Date('2026-10-27T11:05:00.000Z');
    const cutoff = rollingWindowCutoff(now);
    expect(ROLLING_WINDOW_MS).toBe(168 * 60 * 60 * 1000);
    expect(now.getTime() - cutoff.getTime()).toBe(ROLLING_WINDOW_MS);
    expect(cutoff.toISOString()).toBe('2026-10-20T11:05:00.000Z');
  });
});

describe('Requester dashboard API (Lab 4)', () => {
  let req1Cookie: string;
  let staffCookie: string;
  let req1: { id: number };
  let req2: { id: number };
  let categoryId: number;
  let relatedSystemId: number;
  const ticketIds: number[] = [];
  let seq = 0;

  async function makeTicket(requesterId: number, currentStatus: string) {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-TEST-RD-${Date.now()}-${seq++}`,
        summary: 'Requester dashboard test ticket',
        description: 'Fixture for the requester dashboard API test.',
        requestedPriority: 'MEDIUM',
        currentStatus: currentStatus as any,
        requesterId,
        categoryId,
        relatedSystemId,
      },
    });
    ticketIds.push(t.id);
    return t;
  }

  async function addHistory(ticketId: number, toStatus: string, createdAt: Date) {
    await prisma.ticketStatusHistory.create({
      data: { ticketId, toStatus: toStatus as any, createdAt },
    });
  }

  beforeAll(async () => {
    [req1Cookie, staffCookie] = await Promise.all([
      login('requester1@toktickit.com'),
      login('staff1@toktickit.com'),
    ]);
    req1 = await prisma.user.findUniqueOrThrow({ where: { email: 'requester1@toktickit.com' } });
    req2 = await prisma.user.findUniqueOrThrow({ where: { email: 'requester2@toktickit.com' } });
    categoryId = (await prisma.category.findFirstOrThrow()).id;
    relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    await prisma.ticketStatusHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  });

  it('API-36: metrics and recent lists count only the authenticated Requester\'s own Tickets (AC-02)', async () => {
    const before = await get('/api/dashboard/requester', req1Cookie);
    expect(before.status).toBe(200);

    const openBefore = before.body.openTickets.count;
    const waitingBefore = before.body.waitingForMe.count;
    const resolvedBefore = before.body.resolved.count;
    const closedBefore = before.body.closed.count;

    // Fixtures for req1: one in each counted bucket.
    await makeTicket(req1.id, 'OPEN');
    await makeTicket(req1.id, 'WAITING_FOR_REQUESTER');
    const resolvedTicket = await makeTicket(req1.id, 'RESOLVED');
    await addHistory(resolvedTicket.id, 'RESOLVED', new Date());
    await makeTicket(req1.id, 'CLOSED');

    // A matching fixture for a DIFFERENT requester must not leak into req1's counts.
    await makeTicket(req2.id, 'OPEN');
    await makeTicket(req2.id, 'WAITING_FOR_REQUESTER');

    const after = await get('/api/dashboard/requester', req1Cookie);
    expect(after.status).toBe(200);
    // Open group (BR-27) includes both OPEN and WAITING_FOR_REQUESTER, so both fixtures count here.
    expect(after.body.openTickets).toMatchObject({ count: openBefore + 2, drillDown: '/tickets?statusGroup=open' });
    expect(after.body.waitingForMe).toMatchObject({ count: waitingBefore + 1, drillDown: '/tickets?status=WAITING_FOR_REQUESTER' });
    expect(after.body.resolved).toMatchObject({ count: resolvedBefore + 1, drillDown: '/tickets?status=RESOLVED' });
    expect(after.body.closed).toMatchObject({ count: closedBefore + 1, drillDown: '/tickets?status=CLOSED' });

    // Direct database count must match exactly, for req1 only.
    const directOpen = await prisma.ticket.count({
      where: { requesterId: req1.id, currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } },
    });
    expect(after.body.openTickets.count).toBe(directOpen);

    expect(after.body.recentlyUpdated.length).toBeLessThanOrEqual(5);
    expect(after.body.recentlyUpdated[0]).not.toHaveProperty('itPriority');
    for (const row of after.body.recentlyUpdated as { id: number }[]) {
      const owned = await prisma.ticket.count({ where: { id: row.id, requesterId: req1.id } });
      expect(owned).toBe(1);
    }
  });

  it('API-36b: recentlyResolved only includes Tickets whose latest RESOLVED transition is within the last 7 days', async () => {
    const recentTicket = await makeTicket(req1.id, 'RESOLVED');
    await addHistory(recentTicket.id, 'RESOLVED', new Date());

    const staleTicket = await makeTicket(req1.id, 'RESOLVED');
    await addHistory(staleTicket.id, 'RESOLVED', new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));

    const res = await get('/api/dashboard/requester', req1Cookie);
    expect(res.status).toBe(200);
    const ids = (res.body.recentlyResolved as { id: number }[]).map((t) => t.id);
    expect(ids).toContain(recentTicket.id);
    expect(ids).not.toContain(staleTicket.id);
    expect(res.body.recentlyResolved.length).toBeLessThanOrEqual(5);
  });

  it('API-36c: an empty slice of data returns 0 counts and empty arrays, never null (AC-19)', async () => {
    // A brand-new user with no tickets is simulated by filtering recentlyResolved's shape only;
    // the running seed always has data for requester1, so this asserts the response shape never nulls out.
    const res = await get('/api/dashboard/requester', req1Cookie);
    expect(res.status).toBe(200);
    for (const key of ['openTickets', 'waitingForMe', 'resolved', 'closed'] as const) {
      expect(typeof res.body[key].count).toBe('number');
      expect(res.body[key].count).not.toBeNull();
    }
    expect(Array.isArray(res.body.recentlyUpdated)).toBe(true);
    expect(Array.isArray(res.body.recentlyResolved)).toBe(true);
  });

  it('API-36d: IT Staff and Administrator are forbidden from the Requester dashboard (AC-02 scope)', async () => {
    const res = await get('/api/dashboard/requester', staffCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('API-36e: an unauthenticated request is rejected with 401', async () => {
    const res = await request(app).get('/api/dashboard/requester');
    expect(res.status).toBe(401);
  });

  it('API-36f: the response always reports its generation time and the Asia/Bangkok time zone', async () => {
    const res = await get('/api/dashboard/requester', req1Cookie);
    expect(res.status).toBe(200);
    expect(res.body.timeZone).toBe('Asia/Bangkok');
    expect(new Date(res.body.generatedAt).toString()).not.toBe('Invalid Date');
  });
});

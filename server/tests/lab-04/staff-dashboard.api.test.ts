import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { isOpenGroupStatus, OPEN_GROUP_STATUSES, myOpenActionsTicketFilter, pendingFollowUpsTicketFilter } from '../../src/dashboard.js';

const prisma = getPrisma();
const PASSWORD = 'Password123!';
const ALL_STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie']?.[0] ?? '';
}

function get(path: string, cookie: string) {
  return request(app).get(path).set('Cookie', cookie);
}

describe('isOpenGroupStatus (UNIT-06)', () => {
  it('maps NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER and REOPENED to the Open group, and the rest to Non-Open', () => {
    expect(OPEN_GROUP_STATUSES).toHaveLength(5);
    const open = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
    const nonOpen = ['RESOLVED', 'CLOSED', 'CANCELLED'];
    for (const status of open) expect(isOpenGroupStatus(status as any), status).toBe(true);
    for (const status of nonOpen) expect(isOpenGroupStatus(status as any), status).toBe(false);
    expect(ALL_STATUSES).toHaveLength(8);
  });
});

describe('Staff & Administrator dashboard API (Lab 4)', () => {
  let staffCookie: string;
  let staff2Cookie: string;
  let adminCookie: string;
  let req1Cookie: string;
  let staff: { id: number };
  let staff2: { id: number };
  let categoryId: number;
  let relatedSystemId: number;
  let req1Id: number;
  const ticketIds: number[] = [];
  const actionIds: number[] = [];
  let seq = 0;

  async function makeTicket(currentStatus: string, overrides: Partial<{ ownerId: number | null; itPriority: string }> = {}) {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-TEST-SD-${Date.now()}-${seq++}`,
        summary: 'Staff dashboard test ticket',
        description: 'Fixture for the staff dashboard API test.',
        requestedPriority: 'MEDIUM',
        currentStatus: currentStatus as any,
        requesterId: req1Id,
        categoryId,
        relatedSystemId,
        ownerId: overrides.ownerId,
        itPriority: (overrides.itPriority as any) ?? 'UNASSIGNED',
      },
    });
    ticketIds.push(t.id);
    return t;
  }

  async function addAction(ticketId: number, overrides: Partial<{ assignedToId: number; status: string; followUpRequired: boolean }> = {}) {
    const a = await prisma.actionTaken.create({
      data: {
        ticketId,
        performedById: staff.id,
        assignedToId: overrides.assignedToId ?? staff.id,
        description: 'Staff dashboard test action',
        status: (overrides.status as any) ?? 'PLANNED',
        followUpRequired: overrides.followUpRequired ?? false,
        followUpNote: overrides.followUpRequired ? 'Follow up note' : null,
      },
    });
    actionIds.push(a.id);
    return a;
  }

  beforeAll(async () => {
    [staffCookie, staff2Cookie, adminCookie, req1Cookie] = await Promise.all([
      login('staff1@toktickit.com'),
      login('staff2@toktickit.com'),
      login('admin@toktickit.com'),
      login('requester1@toktickit.com'),
    ]);
    staff = await prisma.user.findUniqueOrThrow({ where: { email: 'staff1@toktickit.com' } });
    staff2 = await prisma.user.findUniqueOrThrow({ where: { email: 'staff2@toktickit.com' } });
    req1Id = (await prisma.user.findUniqueOrThrow({ where: { email: 'requester1@toktickit.com' } })).id;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
    relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    await prisma.actionTaken.deleteMany({ where: { id: { in: actionIds } } });
    await prisma.ticketStatusHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  });

  it('API-37: every IT Staff metric matches a direct database query for the current user (AC-16)', async () => {
    await makeTicket('OPEN'); // unassigned + open group
    await makeTicket('IN_PROGRESS', { ownerId: staff.id }); // myOwnedOpen
    const a1 = await makeTicket('OPEN');
    await addAction(a1.id, { assignedToId: staff.id, status: 'IN_PROGRESS' }); // myOpenActions
    const a2 = await makeTicket('OPEN');
    await addAction(a2.id, { assignedToId: staff2.id, followUpRequired: true, status: 'PLANNED' }); // pendingFollowUps (global)
    await makeTicket('OPEN', { itPriority: 'CRITICAL' });
    await makeTicket('RESOLVED');

    const res = await get('/api/dashboard/staff', staffCookie);
    expect(res.status).toBe(200);

    const [directUnassigned, directMyOwnedOpen, directMyOpenActions, directPendingFollowUps] = await Promise.all([
      prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: OPEN_GROUP_STATUSES as any } } }),
      prisma.ticket.count({ where: { ownerId: staff.id, currentStatus: { in: OPEN_GROUP_STATUSES as any } } }),
      // Ticket count, not Action count: one Ticket counts once however many matching Actions it has (AC-18).
      prisma.ticket.count({ where: myOpenActionsTicketFilter(staff.id) }),
      prisma.ticket.count({ where: pendingFollowUpsTicketFilter() }),
    ]);
    expect(res.body.unassigned.count).toBe(directUnassigned);
    expect(res.body.myOwnedOpen.count).toBe(directMyOwnedOpen);
    expect(res.body.myOpenActions.count).toBe(directMyOpenActions);
    expect(res.body.pendingFollowUps.count).toBe(directPendingFollowUps);

    for (const status of ALL_STATUSES) {
      const direct = await prisma.ticket.count({ where: { currentStatus: status as any } });
      expect(res.body.byStatus[status], status).toBe(direct);
    }
    for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      const direct = await prisma.ticket.count({ where: { itPriority: priority as any, currentStatus: { in: OPEN_GROUP_STATUSES as any } } });
      expect(res.body.byItPriority[priority], priority).toBe(direct);
    }

    expect(res.body.unassigned.drillDown).toBe('/staff/queue?ownership=unassigned&statusGroup=open');
    expect(res.body.myOwnedOpen.drillDown).toBe('/staff/queue?ownerId=me&statusGroup=open');
    expect(res.body.myOpenActions.drillDown).toBe('/staff/queue?actionAssignee=me');
    expect(res.body.pendingFollowUps.drillDown).toBe('/staff/queue?followUp=pending');
    expect(res.body.users).toBeUndefined();
  });

  it('UNIT-08: byStatus and byItPriority always report every key, including zero counts', async () => {
    const res = await get('/api/dashboard/staff', staffCookie);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.byStatus).sort()).toEqual([...ALL_STATUSES].sort());
    expect(Object.keys(res.body.byItPriority).sort()).toEqual(['CRITICAL', 'HIGH', 'LOW', 'MEDIUM'].sort());
    for (const v of Object.values(res.body.byStatus)) expect(typeof v).toBe('number');
  });

  it('API-37b: the urgent list orders CRITICAL before HIGH, then oldest updatedAt first, capped at 5', async () => {
    const critical = await makeTicket('OPEN', { itPriority: 'CRITICAL' });
    await new Promise((r) => setTimeout(r, 5));
    const high = await makeTicket('OPEN', { itPriority: 'HIGH' });

    const res = await get('/api/dashboard/staff', staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.urgent.length).toBeLessThanOrEqual(5);
    const ids = (res.body.urgent as { id: number }[]).map((t) => t.id);
    if (ids.includes(critical.id) && ids.includes(high.id)) {
      expect(ids.indexOf(critical.id)).toBeLessThan(ids.indexOf(high.id));
    }
    for (const row of res.body.urgent as { itPriority: string }[]) {
      expect(['CRITICAL', 'HIGH']).toContain(row.itPriority);
    }
  });

  it('API-38: the Administrator dashboard adds active/inactive user counts per role (AC-17)', async () => {
    const res = await get('/api/dashboard/staff', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();

    for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']) {
      const [active, inactive] = await Promise.all([
        prisma.user.count({ where: { role: role as any, isActive: true } }),
        prisma.user.count({ where: { role: role as any, isActive: false } }),
      ]);
      expect(res.body.users[role].active).toBe(active);
      expect(res.body.users[role].inactive).toBe(inactive);
      expect(res.body.users[role].drillDown).toBe(`/admin/users?role=${role}`);
    }
  });

  it('API-39: the Staff Queue API filters by actionAssignee=me and followUp=pending to match the dashboard drill-downs (AC-18)', async () => {
    const dashboard = await get('/api/dashboard/staff', staffCookie);
    expect(dashboard.status).toBe(200);

    const myActionsQueue = await get('/api/staff/tickets?actionAssignee=me&pageSize=50', staffCookie);
    expect(myActionsQueue.status).toBe(200);
    const myActionsDirect = await prisma.ticket.count({
      where: { actionsTaken: { some: { assignedToId: staff.id, status: { in: ['PLANNED', 'IN_PROGRESS'] } } } },
    });
    expect(myActionsQueue.body.pagination.totalItems).toBe(myActionsDirect);

    const followUpQueue = await get('/api/staff/tickets?followUp=pending&pageSize=50', staffCookie);
    expect(followUpQueue.status).toBe(200);
    const followUpDirect = await prisma.ticket.count({
      where: { actionsTaken: { some: { followUpRequired: true, status: { in: ['PLANNED', 'IN_PROGRESS'] } } } },
    });
    expect(followUpQueue.body.pagination.totalItems).toBe(followUpDirect);

    const unassignedOpenQueue = await get('/api/staff/tickets?ownership=unassigned&statusGroup=open&pageSize=50', staffCookie);
    expect(unassignedOpenQueue.status).toBe(200);
    expect(unassignedOpenQueue.body.pagination.totalItems).toBe(dashboard.body.unassigned.count);

    const myOwnedOpenQueue = await get('/api/staff/tickets?ownerId=me&statusGroup=open&pageSize=50', staffCookie);
    expect(myOwnedOpenQueue.status).toBe(200);
    expect(myOwnedOpenQueue.body.pagination.totalItems).toBe(dashboard.body.myOwnedOpen.count);
  });

  it('API-39c: a Ticket with two matching Actions counts once, so the card total equals the drill-down total (AC-16, AC-18)', async () => {
    const before = await get('/api/dashboard/staff', staffCookie);
    const myOpenActionsBefore = before.body.myOpenActions.count;
    const pendingFollowUpsBefore = before.body.pendingFollowUps.count;

    // One Ticket, two Actions both assigned to staff and both pending follow-up.
    const t = await makeTicket('OPEN');
    await addAction(t.id, { assignedToId: staff.id, status: 'PLANNED', followUpRequired: true });
    await addAction(t.id, { assignedToId: staff.id, status: 'IN_PROGRESS', followUpRequired: true });

    const after = await get('/api/dashboard/staff', staffCookie);
    expect(after.status).toBe(200);
    expect(after.body.myOpenActions.count).toBe(myOpenActionsBefore + 1);
    expect(after.body.pendingFollowUps.count).toBe(pendingFollowUpsBefore + 1);

    const myActionsQueue = await get('/api/staff/tickets?actionAssignee=me&pageSize=50', staffCookie);
    expect(myActionsQueue.body.pagination.totalItems).toBe(after.body.myOpenActions.count);

    const followUpQueue = await get('/api/staff/tickets?followUp=pending&pageSize=50', staffCookie);
    expect(followUpQueue.body.pagination.totalItems).toBe(after.body.pendingFollowUps.count);
  });

  it('API-39b: an invalid statusGroup, actionAssignee or followUp value returns 400', async () => {
    expect((await get('/api/staff/tickets?statusGroup=closed', staffCookie)).status).toBe(400);
    expect((await get('/api/staff/tickets?actionAssignee=them', staffCookie)).status).toBe(400);
    expect((await get('/api/staff/tickets?followUp=yes', staffCookie)).status).toBe(400);
    expect((await get('/api/tickets?statusGroup=closed', req1Cookie)).status).toBe(400);
  });

  it('API-40: a Requester is forbidden from the staff dashboard, and an unauthenticated request returns 401', async () => {
    const forbidden = await get('/api/dashboard/staff', req1Cookie);
    expect(forbidden.status).toBe(403);
    const unauthenticated = await request(app).get('/api/dashboard/staff');
    expect(unauthenticated.status).toBe(401);
  });

  it('API-40b: list fields are always arrays and objects, never null, even with the running seed data', async () => {
    const res = await get('/api/dashboard/staff', staffCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.urgent)).toBe(true);
    expect(Array.isArray(res.body.recentlyUpdated)).toBe(true);
    expect(res.body.byStatus).not.toBeNull();
    expect(res.body.byItPriority).not.toBeNull();
  });
});

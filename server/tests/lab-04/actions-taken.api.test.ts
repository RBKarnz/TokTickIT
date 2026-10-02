import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import {
  ACTION_STATUS_TRANSITIONS,
  canTransitionAction,
  isActionAtWithinTolerance,
  validateFollowUp,
} from '../../src/actions.js';
import { csrfFor } from '../helpers/csrf.js';

const prisma = getPrisma();
const PASSWORD = 'Password123!';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie']?.[0] ?? '';
}

function post(path: string, cookie: string, body: object, key?: string) {
  const r = request(app).post(path).set('Cookie', cookie).set('X-CSRF-Token', csrfFor(cookie));
  if (key) r.set('Idempotency-Key', key);
  return r.send(body);
}

function patch(path: string, cookie: string, body: object) {
  return request(app).patch(path).set('Cookie', cookie).set('X-CSRF-Token', csrfFor(cookie)).send(body);
}

describe('Actions Taken unit helpers (Lab 4)', () => {
  it('UNIT-01: action status matrix allows only the BR-09 transitions', () => {
    expect(ACTION_STATUS_TRANSITIONS).toEqual({
      PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    });
    expect(canTransitionAction('PLANNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionAction('IN_PROGRESS', 'PLANNED')).toBe(false);
    expect(canTransitionAction('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionAction('CANCELLED', 'PLANNED')).toBe(false);
  });

  it('UNIT-04: follow-up note validator', () => {
    expect(validateFollowUp(true, null)).not.toBeNull();
    expect(validateFollowUp(true, '   ')).not.toBeNull();
    expect(validateFollowUp(true, 'x'.repeat(1001))).not.toBeNull();
    expect(validateFollowUp(true, 'Order a new cable')).toBeNull();
    expect(validateFollowUp(false, 'Should be empty')).not.toBeNull();
    expect(validateFollowUp(false, null)).toBeNull();
  });

  it('UNIT-05: action datetime tolerance is 5 minutes', () => {
    const now = new Date('2026-09-26T10:00:00.000Z');
    expect(isActionAtWithinTolerance(new Date('2026-09-26T10:05:00.000Z'), now)).toBe(true);
    expect(isActionAtWithinTolerance(new Date('2026-09-26T10:05:00.001Z'), now)).toBe(false);
    expect(isActionAtWithinTolerance(new Date('2026-09-20T00:00:00.000Z'), now)).toBe(true);
  });
});

describe('Actions Taken API (Lab 4)', () => {
  let staffCookie: string;
  let staff2Cookie: string;
  let adminCookie: string;
  let req1Cookie: string;
  let staff: { id: number };
  let staff2: { id: number };
  let admin: { id: number };
  let req1: { id: number };
  let inactiveStaff: { id: number };
  let ticket: { id: number };
  let otherTicket: { id: number };
  let closedTicket: { id: number };
  let cancelledTicket: { id: number };
  const ticketIds: number[] = [];

  const valid = () => ({
    description: 'Checked the network drop in room 402.',
    assignedToId: staff.id,
  });

  async function makeTicket(requesterId: number, currentStatus: 'OPEN' | 'CLOSED' | 'CANCELLED', tag: string) {
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-TEST-ACT-${tag}-${Date.now()}`,
        summary: `Actions test ${tag}`,
        description: 'Actions Taken API test ticket',
        requestedPriority: 'MEDIUM',
        currentStatus,
        requesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
      },
    });
    ticketIds.push(t.id);
    return t;
  }

  async function createAction(cookie: string, body: object = valid(), ticketId = ticket.id) {
    const res = await post(`/api/tickets/${ticketId}/actions`, cookie, body);
    expect(res.status).toBe(201);
    return res.body;
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
    admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@toktickit.com' } });
    req1 = await prisma.user.findUniqueOrThrow({ where: { email: 'requester1@toktickit.com' } });
    inactiveStaff = await prisma.user.findUniqueOrThrow({ where: { email: 'staff.inactive@toktickit.com' } });
    const req2 = await prisma.user.findUniqueOrThrow({ where: { email: 'requester2@toktickit.com' } });

    ticket = await makeTicket(req1.id, 'OPEN', 'MAIN');
    otherTicket = await makeTicket(req2.id, 'OPEN', 'OTHER');
    closedTicket = await makeTicket(req1.id, 'CLOSED', 'CLOSED');
    cancelledTicket = await makeTicket(req1.id, 'CANCELLED', 'CANCELLED');
  });

  afterAll(async () => {
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  });

  describe('create (POST /api/tickets/:ticketId/actions)', () => {
    it('API-01: IT Staff creates a valid action under the ticket', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, {
        ...valid(),
        assignedToId: staff2.id,
        attachmentNotes: 'See floor plan attachment.',
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ticketId: ticket.id,
        status: 'PLANNED',
        followUpRequired: false,
        followUpNote: null,
        version: 1,
        performedBy: { id: staff.id },
        assignedTo: { id: staff2.id },
      });
      expect(res.body.assignedTo.email).toBe('staff2@toktickit.com');
      const row = await prisma.actionTaken.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row.ticketId).toBe(ticket.id);
      expect(row.performedById).toBe(staff.id);
    });

    it('API-02: Administrator creates an action and can be the assignee', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, adminCookie, { ...valid(), assignedToId: admin.id });
      expect(res.status).toBe(201);
      expect(res.body.performedBy.id).toBe(admin.id);
      expect(res.body.assignedTo.id).toBe(admin.id);
    });

    it('API-03: client-supplied performedById is ignored', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { ...valid(), performedById: admin.id });
      expect(res.status).toBe(201);
      expect(res.body.performedBy.id).toBe(staff.id);
    });

    it('API-04: follow-up required without a note is rejected and nothing is saved', async () => {
      const before = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { ...valid(), followUpRequired: true });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fieldErrors.followUpNote).toBeDefined();
      expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(before);
    });

    it('API-05: a note without follow-up required is rejected', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, {
        ...valid(), followUpRequired: false, followUpNote: 'Order a spool',
      });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.followUpNote).toBeDefined();
    });

    it('API-06: inactive IT Staff assignee is rejected', async () => {
      const before = await prisma.actionTaken.count({ where: { ticketId: ticket.id } });
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { ...valid(), assignedToId: inactiveStaff.id });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.assignedToId).toBeDefined();
      expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(before);
    });

    it('API-07: Requester assignee is rejected', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { ...valid(), assignedToId: req1.id });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.assignedToId).toBeDefined();
    });

    it('rejects missing description, missing assignee and CANCELLED as a create status', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { description: '  ', status: 'CANCELLED' });
      expect(res.status).toBe(422);
      expect(Object.keys(res.body.error.fieldErrors)).toEqual(
        expect.arrayContaining(['description', 'assignedToId', 'status']),
      );
    });

    it('rejects creating a COMPLETED action without a result', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { ...valid(), status: 'COMPLETED' });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.result).toBeDefined();
    });

    it('API-22: adding an action to a CLOSED ticket returns 409', async () => {
      const res = await post(`/api/tickets/${closedTicket.id}/actions`, staffCookie, valid());
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('API-23: adding an action to a CANCELLED ticket returns 409', async () => {
      const res = await post(`/api/tickets/${cancelledTicket.id}/actions`, staffCookie, valid());
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('API-24: actionAt more than 5 minutes in the future is rejected', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, { ...valid(), actionAt: future });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.actionAt).toBeDefined();
    });

    it('returns 404 for a missing ticket', async () => {
      const res = await post('/api/tickets/99999999/actions', staffCookie, valid());
      expect(res.status).toBe(404);
    });
  });

  describe('idempotency (AC-09)', () => {
    it('API-19 / API-20: the same Idempotency-Key creates one action and replays it', async () => {
      const key = `act-key-${Date.now()}`;
      const first = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, valid(), key);
      expect(first.status).toBe(201);

      const second = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, valid(), key);
      expect(second.status).toBe(200);
      expect(second.headers['idempotent-replay']).toBe('true');
      expect(second.body.id).toBe(first.body.id);
      expect(await prisma.actionTaken.count({ where: { idempotencyKey: key } })).toBe(1);
    });

    it('parallel submits with one key create only one action', async () => {
      const key = `act-race-${Date.now()}`;
      const results = await Promise.all(
        Array.from({ length: 5 }, () => post(`/api/tickets/${ticket.id}/actions`, staffCookie, valid(), key)),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 200, 200, 200, 201]);
      expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
      expect(await prisma.actionTaken.count({ where: { idempotencyKey: key } })).toBe(1);
    });

    it('rejects an Idempotency-Key longer than 100 characters', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, staffCookie, valid(), 'k'.repeat(101));
      expect(res.status).toBe(400);
    });
  });

  describe('update (PATCH /api/actions/:actionId)', () => {
    it('API-08: PLANNED -> IN_PROGRESS increments the version', async () => {
      const action = await createAction(staffCookie);
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { status: 'IN_PROGRESS', expectedVersion: 1 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.version).toBe(2);
    });

    it('API-09: completing without a result is rejected', async () => {
      const action = await createAction(staffCookie);
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { status: 'COMPLETED', expectedVersion: 1 });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.result).toBeDefined();
      const row = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
      expect(row.status).toBe('PLANNED');
      expect(row.version).toBe(1);
    });

    it('API-10: IN_PROGRESS -> COMPLETED with a result', async () => {
      const action = await createAction(staffCookie, { ...valid(), status: 'IN_PROGRESS' });
      const res = await patch(`/api/actions/${action.id}`, staffCookie, {
        status: 'COMPLETED', result: 'Link negotiated at 1 Gbps.', expectedVersion: 1,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'COMPLETED', result: 'Link negotiated at 1 Gbps.', version: 2 });
    });

    it('API-11: PLANNED -> CANCELLED', async () => {
      const action = await createAction(staffCookie);
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { status: 'CANCELLED', expectedVersion: 1 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('rejects IN_PROGRESS -> PLANNED with 409 CONFLICT', async () => {
      const action = await createAction(staffCookie, { ...valid(), status: 'IN_PROGRESS' });
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { status: 'PLANNED', expectedVersion: 1 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('API-12: a COMPLETED action cannot change', async () => {
      const action = await createAction(staffCookie, { ...valid(), status: 'COMPLETED', result: 'Done.' });
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { description: 'Edited', expectedVersion: 1 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACTION_CLOSED');
      const row = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
      expect(row.description).toBe(valid().description);
    });

    it('API-13: a CANCELLED action cannot change', async () => {
      const action = await createAction(staffCookie);
      await patch(`/api/actions/${action.id}`, staffCookie, { status: 'CANCELLED', expectedVersion: 1 });
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { status: 'IN_PROGRESS', expectedVersion: 2 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACTION_CLOSED');
    });

    it('API-21: a stale expectedVersion returns 409 STALE_UPDATE with the current action', async () => {
      const action = await createAction(staffCookie);
      await patch(`/api/actions/${action.id}`, staff2Cookie, { description: 'Newer text', expectedVersion: 1 });
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { description: 'Older text', expectedVersion: 1 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STALE_UPDATE');
      expect(res.body.error.current).toMatchObject({ id: action.id, description: 'Newer text', version: 2 });
      const row = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
      expect(row.description).toBe('Newer text');
    });

    it('two concurrent updates with the same version: exactly one wins', async () => {
      const action = await createAction(staffCookie);
      const [a, b] = await Promise.all([
        patch(`/api/actions/${action.id}`, staffCookie, { description: 'Writer A', expectedVersion: 1 }),
        patch(`/api/actions/${action.id}`, staff2Cookie, { description: 'Writer B', expectedVersion: 1 }),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const row = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
      expect(row.version).toBe(2);
    });

    it('reassigns to an active Administrator and rejects an inactive staff member', async () => {
      const action = await createAction(staffCookie);
      const bad = await patch(`/api/actions/${action.id}`, staffCookie, { assignedToId: inactiveStaff.id, expectedVersion: 1 });
      expect(bad.status).toBe(422);
      expect(bad.body.error.fieldErrors.assignedToId).toBeDefined();

      const ok = await patch(`/api/actions/${action.id}`, adminCookie, { assignedToId: admin.id, expectedVersion: 1 });
      expect(ok.status).toBe(200);
      expect(ok.body.assignedTo.id).toBe(admin.id);
      expect(ok.body.performedBy.id).toBe(staff.id); // BR-03: performer never changes
    });

    it('follow-up rules apply on update and turning follow-up off clears the note', async () => {
      const action = await createAction(staffCookie);
      const bad = await patch(`/api/actions/${action.id}`, staffCookie, { followUpRequired: true, expectedVersion: 1 });
      expect(bad.status).toBe(422);

      const on = await patch(`/api/actions/${action.id}`, staffCookie, {
        followUpRequired: true, followUpNote: 'Call the vendor.', expectedVersion: 1,
      });
      expect(on.status).toBe(200);
      expect(on.body.followUpNote).toBe('Call the vendor.');

      const off = await patch(`/api/actions/${action.id}`, staffCookie, { followUpRequired: false, expectedVersion: 2 });
      expect(off.status).toBe(200);
      expect(off.body.followUpNote).toBeNull();
    });

    it('requires expectedVersion', async () => {
      const action = await createAction(staffCookie);
      const res = await patch(`/api/actions/${action.id}`, staffCookie, { description: 'No version' });
      expect(res.status).toBe(422);
      expect(res.body.error.fieldErrors.expectedVersion).toBeDefined();
    });

    it('returns 404 for a missing action', async () => {
      const res = await patch('/api/actions/99999999', staffCookie, { description: 'x', expectedVersion: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('list and Requester access (AC-07, AC-08)', () => {
    it('API-14: several actions by different staff are listed by actionAt, then id', async () => {
      const t = await makeTicket(req1.id, 'OPEN', 'ORDER');
      const at = '2026-09-20T08:00:00.000Z';
      const late = await createAction(staffCookie, { ...valid(), actionAt: '2026-09-21T08:00:00.000Z' }, t.id);
      const sameA = await createAction(staff2Cookie, { ...valid(), actionAt: at }, t.id);
      const sameB = await createAction(adminCookie, { ...valid(), actionAt: at }, t.id);

      const res = await request(app).get(`/api/tickets/${t.id}/actions`).set('Cookie', staffCookie);
      expect(res.status).toBe(200);
      expect(res.body.items.map((a: { id: number }) => a.id)).toEqual([sameA.id, sameB.id, late.id]);
      expect(new Set(res.body.items.map((a: { performedBy: { id: number } }) => a.performedBy.id)))
        .toEqual(new Set([staff.id, staff2.id, admin.id]));
    });

    it('API-15: Requester reads actions of their own ticket', async () => {
      await createAction(staffCookie);
      const res = await request(app).get(`/api/tickets/${ticket.id}/actions`).set('Cookie', req1Cookie);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items[0]).toHaveProperty('performedBy');
      expect(res.body.items[0]).toHaveProperty('followUpNote');
    });

    it('API-16: Requester cannot create an action on their own ticket', async () => {
      const res = await post(`/api/tickets/${ticket.id}/actions`, req1Cookie, valid());
      expect(res.status).toBe(403);
    });

    it('API-17: Requester cannot update an action on their own ticket', async () => {
      const action = await createAction(staffCookie);
      const res = await patch(`/api/actions/${action.id}`, req1Cookie, { description: 'Hack', expectedVersion: 1 });
      expect(res.status).toBe(403);
    });

    it('API-18: Requester reading another Requester\'s ticket gets 404', async () => {
      const res = await request(app).get(`/api/tickets/${otherTicket.id}/actions`).set('Cookie', req1Cookie);
      expect(res.status).toBe(404);
    });

    it('Requester write on another Requester\'s ticket returns 403', async () => {
      const res = await post(`/api/tickets/${otherTicket.id}/actions`, req1Cookie, valid());
      expect(res.status).toBe(403);
    });

    it('Administrator can list actions', async () => {
      const res = await request(app).get(`/api/tickets/${ticket.id}/actions`).set('Cookie', adminCookie);
      expect(res.status).toBe(200);
    });
  });

  describe('session and CSRF', () => {
    it('returns 401 without a session', async () => {
      expect((await request(app).get(`/api/tickets/${ticket.id}/actions`)).status).toBe(401);
      expect((await request(app).post(`/api/tickets/${ticket.id}/actions`).send(valid())).status).toBe(401);
      expect((await request(app).patch('/api/actions/1').send({ expectedVersion: 1 })).status).toBe(401);
    });

    it('rejects create and update without a valid CSRF token', async () => {
      const action = await createAction(staffCookie);
      const create = await request(app).post(`/api/tickets/${ticket.id}/actions`)
        .set('Cookie', staffCookie).send(valid());
      expect(create.status).toBe(403);
      const update = await request(app).patch(`/api/actions/${action.id}`)
        .set('Cookie', staffCookie).set('X-CSRF-Token', 'bad-token').send({ description: 'x', expectedVersion: 1 });
      expect(update.status).toBe(403);
      const row = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
      expect(row.version).toBe(1);
    });

    it('rejects a write from a foreign Origin', async () => {
      const res = await request(app).post(`/api/tickets/${ticket.id}/actions`)
        .set('Cookie', staffCookie).set('X-CSRF-Token', csrfFor(staffCookie))
        .set('Origin', 'https://evil.example.com').send(valid());
      expect(res.status).toBe(403);
    });
  });
});

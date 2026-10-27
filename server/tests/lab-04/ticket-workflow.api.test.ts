import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { ActionStatus, TicketStatus } from '@prisma/client';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionTicket,
  evaluateResolutionGate,
} from '../../src/workflow.js';
import { csrfFor } from '../helpers/csrf.js';

const prisma = getPrisma();
const PASSWORD = 'Password123!';
const STATUSES = Object.keys(ALLOWED_STATUS_TRANSITIONS) as TicketStatus[];

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie']?.[0] ?? '';
}

function send(method: 'post' | 'patch' | 'put' | 'delete', path: string, cookie: string, body: object = {}) {
  return request(app)[method](path).set('Cookie', cookie).set('X-CSRF-Token', csrfFor(cookie)).send(body);
}

describe('Ticket workflow unit helpers (Lab 4)', () => {
  it('UNIT-02: canTransitionTicket is true only for pairs in the final status matrix', () => {
    const matrix: Record<string, string[]> = {
      NEW: ['OPEN', 'CANCELLED'],
      OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
      IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
      WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
      RESOLVED: ['CLOSED', 'REOPENED'],
      CLOSED: ['REOPENED'],
      REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
      CANCELLED: [],
    };
    expect(STATUSES).toHaveLength(8);
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        expect(canTransitionTicket(from, to), `${from} -> ${to}`).toBe(matrix[from].includes(to));
      }
    }
    expect(canTransitionTicket('UNKNOWN', 'OPEN')).toBe(false);
  });

  it('UNIT-03: evaluateResolutionGate reports each failed condition in a fixed order', () => {
    const done = { status: 'COMPLETED' as ActionStatus, followUpRequired: false };
    const pending = { status: 'IN_PROGRESS' as ActionStatus, followUpRequired: true };

    expect(evaluateResolutionGate({ resolutionSummary: 'Fixed', actions: [done] })).toEqual([]);
    expect(evaluateResolutionGate({ resolutionSummary: '   ', actions: [done] })).toEqual(['RESOLUTION_SUMMARY_REQUIRED']);
    expect(evaluateResolutionGate({ resolutionSummary: null, actions: [done] })).toEqual(['RESOLUTION_SUMMARY_REQUIRED']);
    expect(evaluateResolutionGate({ resolutionSummary: 'Fixed', actions: [] })).toEqual(['COMPLETED_ACTION_REQUIRED']);
    expect(evaluateResolutionGate({ resolutionSummary: 'Fixed', actions: [done, pending] })).toEqual(['PENDING_FOLLOW_UP']);
    expect(evaluateResolutionGate({ resolutionSummary: 'Fixed', actions: [done, { status: 'PLANNED', followUpRequired: true }] }))
      .toEqual(['PENDING_FOLLOW_UP']);
    expect(evaluateResolutionGate({ resolutionSummary: '', actions: [pending] }))
      .toEqual(['RESOLUTION_SUMMARY_REQUIRED', 'COMPLETED_ACTION_REQUIRED', 'PENDING_FOLLOW_UP']);

    // Finished or cancelled follow-ups, and open actions without follow-up, do not block.
    expect(evaluateResolutionGate({
      resolutionSummary: 'Fixed',
      actions: [
        { status: 'COMPLETED', followUpRequired: true },
        { status: 'CANCELLED', followUpRequired: true },
        { status: 'PLANNED', followUpRequired: false },
      ],
    })).toEqual([]);
    // A cancelled action is not a completed one.
    expect(evaluateResolutionGate({ resolutionSummary: 'Fixed', actions: [{ status: 'CANCELLED', followUpRequired: false }] }))
      .toEqual(['COMPLETED_ACTION_REQUIRED']);
  });
});

describe('Ticket workflow API (Lab 4)', () => {
  let staffCookie: string;
  let staff2Cookie: string;
  let adminCookie: string;
  let req1Cookie: string;
  let req2Cookie: string;
  let staff: { id: number; name: string };
  let admin: { id: number };
  let req1: { id: number };
  let categoryId: number;
  let relatedSystemId: number;
  const ticketIds: number[] = [];
  let seq = 0;

  async function makeTicket(currentStatus: TicketStatus = 'NEW', requesterId = req1.id) {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-TEST-WF-${Date.now()}-${seq++}`,
        summary: 'Workflow test ticket',
        description: 'Ticket workflow API test ticket',
        requestedPriority: 'MEDIUM',
        currentStatus,
        requesterId,
        categoryId,
        relatedSystemId,
      },
    });
    ticketIds.push(t.id);
    return t;
  }

  function addAction(ticketId: number, status: ActionStatus = 'COMPLETED', followUpRequired = false) {
    return prisma.actionTaken.create({
      data: {
        ticketId,
        performedById: staff.id,
        assignedToId: staff.id,
        description: 'Workflow test action',
        result: status === 'COMPLETED' ? 'Done' : null,
        status,
        followUpRequired,
        followUpNote: followUpRequired ? 'Check again tomorrow' : null,
      },
    });
  }

  const setStatus = (ticketId: number, cookie: string, body: object) =>
    send('post', `/api/staff/tickets/${ticketId}/status`, cookie, body);
  const dbTicket = (id: number) => prisma.ticket.findUniqueOrThrow({ where: { id } });
  const historyCount = (ticketId: number) => prisma.ticketStatusHistory.count({ where: { ticketId } });

  beforeAll(async () => {
    [staffCookie, staff2Cookie, adminCookie, req1Cookie, req2Cookie] = await Promise.all([
      login('staff1@toktickit.com'),
      login('staff2@toktickit.com'),
      login('admin@toktickit.com'),
      login('requester1@toktickit.com'),
      login('requester2@toktickit.com'),
    ]);
    staff = await prisma.user.findUniqueOrThrow({ where: { email: 'staff1@toktickit.com' } });
    admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@toktickit.com' } });
    req1 = await prisma.user.findUniqueOrThrow({ where: { email: 'requester1@toktickit.com' } });
    categoryId = (await prisma.category.findFirstOrThrow()).id;
    relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    await prisma.ticketStatusHistory.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  });

  describe('status matrix and roles (AC-10, AC-15)', () => {
    it('API-25: IT Staff moves OPEN to IN_PROGRESS and the version increases', async () => {
      const t = await makeTicket('OPEN');
      const res = await setStatus(t.id, staffCookie, { status: 'IN_PROGRESS', expectedVersion: t.version });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ticketId: t.id, currentStatus: 'IN_PROGRESS', version: t.version + 1 });
      expect((await dbTicket(t.id)).currentStatus).toBe('IN_PROGRESS');
    });

    it('API-26: Administrator moves NEW to OPEN', async () => {
      const t = await makeTicket('NEW');
      const res = await setStatus(t.id, adminCookie, { status: 'OPEN' });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe('OPEN');
      expect(res.body.history.at(-1).changedBy).toMatchObject({ id: admin.id, role: 'ADMINISTRATOR' });
    });

    it('API-27: NEW to RESOLVED is rejected with 409 CONFLICT and changes nothing', async () => {
      const t = await makeTicket('NEW');
      await addAction(t.id);
      const res = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Jumped' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      const after = await dbTicket(t.id);
      expect(after).toMatchObject({ currentStatus: 'NEW', version: t.version, resolutionSummary: null });
      expect(await historyCount(t.id)).toBe(0);
    });

    it('API-28: a Requester cannot change status on either route', async () => {
      const t = await makeTicket('NEW');
      const viaStaff = await setStatus(t.id, req1Cookie, { status: 'OPEN' });
      const viaAlias = await send('patch', `/api/tickets/${t.id}/status`, req1Cookie, { status: 'OPEN' });
      expect(viaStaff.status).toBe(403);
      expect(viaAlias.status).toBe(403);
      expect(viaAlias.body.error.code).toBe('FORBIDDEN');
      expect((await dbTicket(t.id)).currentStatus).toBe('NEW');
      expect(await historyCount(t.id)).toBe(0);
    });

    it('API-44: PATCH /api/tickets/:id/status behaves like the staff route', async () => {
      const t = await makeTicket('NEW');
      const res = await send('patch', `/api/tickets/${t.id}/status`, staffCookie, { status: 'Open', reason: 'Triage' });
      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe('OPEN');
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0]).toMatchObject({ fromStatus: 'NEW', toStatus: 'OPEN', reason: 'Triage' });
    });

    it('API-45: invalid reason or expectedVersion is rejected with 422 and changes nothing', async () => {
      const t = await makeTicket('NEW');
      const longReason = await setStatus(t.id, staffCookie, { status: 'OPEN', reason: 'x'.repeat(1001) });
      const badVersion = await setStatus(t.id, staffCookie, { status: 'OPEN', expectedVersion: '1' });
      expect(longReason.status).toBe(422);
      expect(longReason.body.error.fieldErrors.reason).toBeDefined();
      expect(badVersion.status).toBe(422);
      expect(badVersion.body.error.fieldErrors.expectedVersion).toBeDefined();
      expect((await dbTicket(t.id)).currentStatus).toBe('NEW');
    });

    it('API-46: Administrator can use every IT Staff ticket operation', async () => {
      const t = await makeTicket('NEW');
      const queue = await request(app).get('/api/staff/tickets').set('Cookie', adminCookie);
      const claim = await send('post', `/api/staff/tickets/${t.id}/claim`, adminCookie);
      const owner = await send('put', `/api/staff/tickets/${t.id}/owner`, adminCookie, { ownerId: staff.id });
      const priority = await send('patch', `/api/staff/tickets/${t.id}/it-priority`, adminCookie, { itPriority: 'HIGH' });
      const comment = await send('post', `/api/tickets/${t.id}/public-comments`, adminCookie, { content: 'Admin reply' });
      const detail = await request(app).get(`/api/staff/tickets/${t.id}`).set('Cookie', adminCookie);

      expect(queue.status).toBe(200);
      expect(claim.status).toBe(200);
      expect(claim.body.owner.id).toBe(admin.id);
      expect(owner.status).toBe(200);
      expect(owner.body.owner.id).toBe(staff.id);
      expect(priority.status).toBe(200);
      expect(comment.status).toBe(201);
      expect(detail.status).toBe(200);
      expect(detail.body._count).toEqual({ actionsTaken: 0, statusHistory: 0 });
      // Claim, owner and priority writes leave the version alone (api-spec §4.1).
      expect(detail.body.version).toBe(t.version);
    });
  });

  describe('resolution gate (AC-11, AC-12)', () => {
    it('API-29: Resolved without a summary is rejected with RESOLUTION_SUMMARY_REQUIRED', async () => {
      const t = await makeTicket('IN_PROGRESS');
      await addAction(t.id);
      const res = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: '   ' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESOLUTION_GATE');
      expect(res.body.error.details).toEqual(['RESOLUTION_SUMMARY_REQUIRED']);
      expect((await dbTicket(t.id)).currentStatus).toBe('IN_PROGRESS');
    });

    it('API-30: Resolved without a completed action is rejected with COMPLETED_ACTION_REQUIRED', async () => {
      const t = await makeTicket('IN_PROGRESS');
      await addAction(t.id, 'IN_PROGRESS');
      const res = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Fixed' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('RESOLUTION_GATE');
      expect(res.body.error.details).toEqual(['COMPLETED_ACTION_REQUIRED']);
      expect(await dbTicket(t.id)).toMatchObject({ currentStatus: 'IN_PROGRESS', resolutionSummary: null });
    });

    it('API-31: Resolved with a pending follow-up is rejected; all failed conditions are listed', async () => {
      const t = await makeTicket('IN_PROGRESS');
      await addAction(t.id);
      await addAction(t.id, 'PLANNED', true);
      const pending = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Fixed' });
      expect(pending.status).toBe(409);
      expect(pending.body.error.details).toEqual(['PENDING_FOLLOW_UP']);

      const empty = await makeTicket('IN_PROGRESS');
      await addAction(empty.id, 'IN_PROGRESS', true);
      const all = await setStatus(empty.id, staffCookie, { status: 'RESOLVED' });
      expect(all.status).toBe(409);
      expect(all.body.error.details).toEqual(['RESOLUTION_SUMMARY_REQUIRED', 'COMPLETED_ACTION_REQUIRED', 'PENDING_FOLLOW_UP']);
      expect(await historyCount(empty.id)).toBe(0);
    });

    it('API-32: Resolved succeeds when all three conditions hold and appends history', async () => {
      const t = await makeTicket('IN_PROGRESS');
      await addAction(t.id);
      await addAction(t.id, 'COMPLETED', true);
      const res = await setStatus(t.id, staffCookie, {
        status: 'RESOLVED', resolutionSummary: '  Replaced the cable.  ', reason: 'Work finished', expectedVersion: t.version,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ currentStatus: 'RESOLVED', resolutionSummary: 'Replaced the cable.', version: t.version + 1 });
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0]).toMatchObject({
        fromStatus: 'IN_PROGRESS', toStatus: 'RESOLVED', reason: 'Work finished',
        changedBy: { id: staff.id, name: staff.name, role: 'IT_STAFF' },
      });
    });

    it('API-33: Problem Appears Resolved changes neither status, version nor history, and does not satisfy the gate', async () => {
      const t = await makeTicket('IN_PROGRESS');
      const mark = await send('post', `/api/tickets/${t.id}/problem-appears-resolved`, req1Cookie);
      expect(mark.status).toBe(200);
      expect(mark.body.requesterResolvedAt).toBeTruthy();

      const after = await dbTicket(t.id);
      expect(after).toMatchObject({ currentStatus: 'IN_PROGRESS', version: t.version });
      expect(await historyCount(t.id)).toBe(0);

      const res = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Requester says it works' });
      expect(res.status).toBe(409);
      expect(res.body.error.details).toEqual(['COMPLETED_ACTION_REQUIRED']);
    });
  });

  describe('status history (AC-13)', () => {
    it('API-34: history is returned in stable order with the actor, to the roles allowed to view the ticket', async () => {
      const t = await makeTicket('NEW');
      await setStatus(t.id, staffCookie, { status: 'OPEN' });
      await setStatus(t.id, adminCookie, { status: 'IN_PROGRESS', reason: 'Started' });
      await setStatus(t.id, staffCookie, { status: 'WAITING_FOR_REQUESTER' });

      const path = `/api/tickets/${t.id}/status-history`;
      const [asStaff, asOwner, asOther, anonymous] = await Promise.all([
        request(app).get(path).set('Cookie', staffCookie),
        request(app).get(path).set('Cookie', req1Cookie),
        request(app).get(path).set('Cookie', req2Cookie),
        request(app).get(path),
      ]);

      expect(asStaff.status).toBe(200);
      const items = asStaff.body.items;
      expect(items.map((i: any) => `${i.fromStatus}>${i.toStatus}`)).toEqual([
        'NEW>OPEN', 'OPEN>IN_PROGRESS', 'IN_PROGRESS>WAITING_FOR_REQUESTER',
      ]);
      const sorted = [...items].sort((a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id);
      expect(items).toEqual(sorted);
      expect(items[1]).toMatchObject({ reason: 'Started', changedBy: { id: admin.id, role: 'ADMINISTRATOR' } });
      expect(items[0].changedBy).not.toHaveProperty('email');

      expect(asOwner.status).toBe(200);
      expect(asOwner.body.items).toEqual(items);
      expect(asOther.status).toBe(404);
      expect(anonymous.status).toBe(401);
    });

    it('API-47: history entries cannot be edited or deleted through the API', async () => {
      const t = await makeTicket('NEW');
      await setStatus(t.id, staffCookie, { status: 'OPEN', reason: 'Original' });
      const before = await prisma.ticketStatusHistory.findMany({ where: { ticketId: t.id } });
      const base = `/api/tickets/${t.id}/status-history`;

      const responses = await Promise.all([
        send('post', base, staffCookie, { toStatus: 'CLOSED' }),
        send('put', `${base}/${before[0].id}`, adminCookie, { reason: 'Edited' }),
        send('patch', `${base}/${before[0].id}`, adminCookie, { reason: 'Edited' }),
        send('delete', `${base}/${before[0].id}`, adminCookie),
        send('delete', base, adminCookie),
      ]);
      for (const res of responses) expect(res.status).toBe(404);
      expect(await prisma.ticketStatusHistory.findMany({ where: { ticketId: t.id } })).toEqual(before);
    });
  });

  describe('stale updates (AC-14)', () => {
    it('API-35: a stale expectedVersion is rejected with STALE_UPDATE and overwrites nothing', async () => {
      const t = await makeTicket('OPEN');
      const first = await setStatus(t.id, staffCookie, { status: 'IN_PROGRESS', expectedVersion: t.version });
      expect(first.status).toBe(200);

      const stale = await setStatus(t.id, staff2Cookie, { status: 'CANCELLED', expectedVersion: t.version });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('STALE_UPDATE');
      expect(stale.body.error.current).toMatchObject({ ticketId: t.id, currentStatus: 'IN_PROGRESS', version: t.version + 1 });
      expect(await dbTicket(t.id)).toMatchObject({ currentStatus: 'IN_PROGRESS', version: t.version + 1 });
      expect(await historyCount(t.id)).toBe(1);
    });

    it('WF-06: of two parallel changes with the same expectedVersion exactly one succeeds', async () => {
      const t = await makeTicket('OPEN');
      const [a, b] = await Promise.all([
        setStatus(t.id, staffCookie, { status: 'IN_PROGRESS', expectedVersion: t.version }),
        setStatus(t.id, staff2Cookie, { status: 'WAITING_FOR_REQUESTER', expectedVersion: t.version }),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const winner = a.status === 200 ? a : b;
      const loser = a.status === 200 ? b : a;
      expect(loser.body.error.code).toBe('STALE_UPDATE');
      expect(await dbTicket(t.id)).toMatchObject({ currentStatus: winner.body.currentStatus, version: t.version + 1 });
      expect(await historyCount(t.id)).toBe(1);
    });
  });

  describe('lifecycles', () => {
    it('WF-01: NEW to OPEN to IN_PROGRESS to RESOLVED to CLOSED with an action completed on the way', async () => {
      const t = await makeTicket('NEW');
      expect((await setStatus(t.id, staffCookie, { status: 'OPEN' })).status).toBe(200);
      expect((await setStatus(t.id, staffCookie, { status: 'IN_PROGRESS' })).status).toBe(200);

      const created = await send('post', `/api/tickets/${t.id}/actions`, staffCookie, {
        description: 'Replaced the power supply.', assignedToId: staff.id, status: 'IN_PROGRESS',
      });
      expect(created.status).toBe(201);
      const early = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Replaced PSU' });
      expect(early.status).toBe(409);

      const completed = await send('patch', `/api/actions/${created.body.id}`, staffCookie, {
        status: 'COMPLETED', result: 'Server boots normally.', expectedVersion: created.body.version,
      });
      expect(completed.status).toBe(200);

      expect((await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Replaced PSU' })).status).toBe(200);
      const closed = await setStatus(t.id, staffCookie, { status: 'CLOSED' });
      expect(closed.status).toBe(200);
      expect(closed.body).toMatchObject({ currentStatus: 'CLOSED', resolutionSummary: 'Replaced PSU', version: t.version + 4 });
    });

    it('WF-02: a reopened ticket passes the gate again only after new follow-up work is finished', async () => {
      const t = await makeTicket('REOPENED');
      await addAction(t.id);
      const followUp = await addAction(t.id, 'PLANNED', true);
      expect((await setStatus(t.id, staffCookie, { status: 'IN_PROGRESS' })).status).toBe(200);

      const blocked = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Fixed again' });
      expect(blocked.status).toBe(409);
      expect(blocked.body.error.details).toEqual(['PENDING_FOLLOW_UP']);

      await prisma.actionTaken.update({ where: { id: followUp.id }, data: { status: 'COMPLETED', result: 'Verified' } });
      const resolved = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Fixed again' });
      expect(resolved.status).toBe(200);
    });

    it('WF-07: re-resolving after REOPENED falls back to the stored resolution summary when none is resent', async () => {
      const t = await makeTicket('NEW');
      await addAction(t.id);
      expect((await setStatus(t.id, staffCookie, { status: 'OPEN' })).status).toBe(200);
      expect((await setStatus(t.id, staffCookie, { status: 'IN_PROGRESS' })).status).toBe(200);

      const action = await send('post', `/api/tickets/${t.id}/actions`, staffCookie, {
        description: 'Replaced the cable.', assignedToId: staff.id, status: 'COMPLETED', result: 'Link stable.',
      });
      expect(action.status).toBe(201);

      const resolved = await setStatus(t.id, staffCookie, { status: 'RESOLVED', resolutionSummary: 'Replaced the cable.' });
      expect(resolved.status).toBe(200);
      expect(resolved.body.resolutionSummary).toBe('Replaced the cable.');

      expect((await setStatus(t.id, staffCookie, { status: 'REOPENED' })).status).toBe(200);
      expect((await setStatus(t.id, staffCookie, { status: 'IN_PROGRESS' })).status).toBe(200);

      // No resolutionSummary in this request: the gate must fall back to the one already stored.
      const resolvedAgain = await setStatus(t.id, staffCookie, { status: 'RESOLVED' });
      expect(resolvedAgain.status).toBe(200);
      expect(resolvedAgain.body.resolutionSummary).toBe('Replaced the cable.');
    });

    it('WF-03: a cancelled ticket accepts no further status change', async () => {
      const t = await makeTicket('NEW');
      expect((await setStatus(t.id, staffCookie, { status: 'CANCELLED', reason: 'Duplicate' })).status).toBe(200);
      for (const target of STATUSES) {
        const res = await setStatus(t.id, adminCookie, { status: target, resolutionSummary: 'x' });
        expect(res.status, target).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
      }
      expect(await historyCount(t.id)).toBe(1);
    });

    it('WF-04: CLOSED to REOPENED stores the reason in the history entry', async () => {
      const t = await makeTicket('CLOSED');
      const res = await setStatus(t.id, staffCookie, { status: 'REOPENED', reason: 'Issue came back after the update.' });
      expect(res.status).toBe(200);
      expect(res.body.history.at(-1)).toMatchObject({
        fromStatus: 'CLOSED', toStatus: 'REOPENED', reason: 'Issue came back after the update.',
      });
    });

    it('WF-05: N successful changes append exactly N entries and rejected changes append none', async () => {
      const t = await makeTicket('NEW');
      const steps: [string, number][] = [
        ['OPEN', 200],
        ['OPEN', 409], // self-transition
        ['CLOSED', 409], // outside the matrix
        ['IN_PROGRESS', 200],
        ['RESOLVED', 409], // gate
        ['WAITING_FOR_REQUESTER', 200],
      ];
      for (const [status, expected] of steps) {
        const res = await setStatus(t.id, staffCookie, { status, resolutionSummary: 'x' });
        expect(res.status, status).toBe(expected);
      }
      expect(await historyCount(t.id)).toBe(3);
      expect((await dbTicket(t.id)).version).toBe(t.version + 3);
    });
  });
});

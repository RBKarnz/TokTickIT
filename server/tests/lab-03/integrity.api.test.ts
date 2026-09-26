import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import { hashPassword } from '../../src/auth.js';
import { csrfFor } from '../helpers/csrf.js';

const prisma = getPrisma();
const PASSWORD = 'Password123!';

async function login(email: string, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.headers['set-cookie']?.[0] ?? '';
}

describe('Integrity Tests (Lab 3 API-65, API-66 / SEC-11, UNIT-10)', () => {
  let staffCookie: string;
  let staff2Cookie: string;
  let requesterCookie: string;
  let requesterId: number;
  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];
  const tempAdminEmail = `integrity.admin.${Date.now()}@toktickit.com`;

  beforeAll(async () => {
    [staffCookie, staff2Cookie, requesterCookie] = await Promise.all([
      login('staff1@toktickit.com'), login('staff2@toktickit.com'), login('requester3@toktickit.com'),
    ]);
    requesterId = (await prisma.user.findUniqueOrThrow({ where: { email: 'requester3@toktickit.com' } })).id;
    const sample = await prisma.ticket.findFirstOrThrow();
    categoryId = sample.categoryId;
    relatedSystemId = sample.relatedSystemId;
  });

  afterAll(async () => {
    // Always leave the seeded Administrator active and remove the temporary one.
    await prisma.user.update({ where: { email: 'admin@toktickit.com' }, data: { role: 'ADMINISTRATOR', isActive: true } });
    const temp = await prisma.user.findUnique({ where: { email: tempAdminEmail } });
    if (temp) {
      await prisma.session.deleteMany({ where: { userId: temp.id } });
      await prisma.user.delete({ where: { id: temp.id } });
    }
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  });

  it('UNIT-10: a new Ticket gets IT Priority initialised from Requested Priority', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Cookie', requesterCookie).set('X-CSRF-Token', csrfFor(requesterCookie))
      .send({ categoryId, relatedSystemId, requestedPriority: 'HIGH', summary: 'UNIT-10 priority init', description: 'Integrity test ticket' });

    expect(res.status).toBe(201);
    createdTicketIds.push(res.body.id);
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.requestedPriority).toBe('HIGH');
    expect(stored.itPriority).toBe('HIGH');
  });

  it('API-65: concurrent status transitions from the same state cannot silently overwrite each other', async () => {
    const lastTicket = await prisma.ticket.findFirstOrThrow({ orderBy: { id: 'desc' } });
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-INT-${Date.now()}`,
        requesterId,
        categoryId,
        relatedSystemId,
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        currentStatus: 'IN_PROGRESS',
        summary: 'API-65 concurrent status',
        description: `Integrity test (after #${lastTicket.id})`,
      },
    });
    createdTicketIds.push(ticket.id);

    const [a, b] = await Promise.all([
      request(app).post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staffCookie).set('X-CSRF-Token', csrfFor(staffCookie))
        .send({ status: 'RESOLVED', resolutionSummary: 'Resolved by staff 1' }),
      request(app).post(`/api/staff/tickets/${ticket.id}/status`)
        .set('Cookie', staff2Cookie).set('X-CSRF-Token', csrfFor(staff2Cookie))
        .send({ status: 'WAITING_FOR_REQUESTER' }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const winner = a.status === 200 ? a : b;
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.currentStatus).toBe(winner.body.currentStatus);
  });

  it('API-66 / SEC-11: concurrent demotions can never leave zero active Administrators', async () => {
    await prisma.user.create({
      data: {
        name: 'Integrity Admin',
        email: tempAdminEmail,
        passwordHash: await hashPassword(PASSWORD),
        role: 'ADMINISTRATOR',
        isActive: true,
        mustChangePassword: false,
      },
    });
    const seededAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@toktickit.com' } });
    const tempAdmin = await prisma.user.findUniqueOrThrow({ where: { email: tempAdminEmail } });
    // Only these two admins may be active for the race to be meaningful.
    const othersActive = await prisma.user.count({
      where: { role: 'ADMINISTRATOR', isActive: true, id: { notIn: [seededAdmin.id, tempAdmin.id] } },
    });
    expect(othersActive).toBe(0);

    const [seededCookie, tempCookie] = await Promise.all([login('admin@toktickit.com'), login(tempAdminEmail)]);
    const [r1, r2] = await Promise.all([
      request(app).patch(`/api/admin/users/${tempAdmin.id}`)
        .set('Cookie', seededCookie).set('X-CSRF-Token', csrfFor(seededCookie)).send({ role: 'IT_STAFF' }),
      request(app).patch(`/api/admin/users/${seededAdmin.id}`)
        .set('Cookie', tempCookie).set('X-CSRF-Token', csrfFor(tempCookie)).send({ role: 'IT_STAFF' }),
    ]);

    const activeAdmins = await prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } });
    expect(activeAdmins).toBeGreaterThanOrEqual(1);
    expect([r1.status, r2.status]).toContain(409);
  });
});

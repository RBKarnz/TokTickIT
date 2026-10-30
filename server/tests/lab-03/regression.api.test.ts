import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

// API-18 / API-19: Tickets and Attachments that existed before Lab 3 (seed data carried
// through the migration) remain available to their original Requester only.
describe('Lab 2 Regression on migrated data (API-18, API-19)', () => {
  let ownerEmail: string;
  let otherEmail: string;
  let ticketId: number;
  let attachmentId: number;

  beforeAll(async () => {
    const attachment = await prisma.attachment.findFirstOrThrow({
      where: { isRemoved: false, ticket: { requester: { role: 'REQUESTER', isActive: true, mustChangePassword: false, email: { endsWith: '@toktickit.com' } } } },
      include: { ticket: { include: { requester: true } } },
      orderBy: { id: 'asc' },
    });
    attachmentId = attachment.id;
    ticketId = attachment.ticketId;
    ownerEmail = attachment.ticket.requester.email;
    otherEmail = ownerEmail === 'requester2@toktickit.com' ? 'requester1@toktickit.com' : 'requester2@toktickit.com';
  });

  const cookieFor = async (email: string) =>
    (await request(app).post('/api/auth/login').send({ email, password: 'Password123!' })).headers['set-cookie']?.[0] ?? '';

  it('API-18: an existing Ticket is still returned to its original Requester and hidden from others', async () => {
    const own = await request(app).get(`/api/tickets/${ticketId}`).set('Cookie', await cookieFor(ownerEmail));
    const other = await request(app).get(`/api/tickets/${ticketId}`).set('Cookie', await cookieFor(otherEmail));

    expect(own.status).toBe(200);
    expect(own.body.id ?? own.body.ticket?.id).toBe(ticketId);
    expect(other.status).toBe(404);
  });

  it('API-19: an existing Attachment keeps its ownership behaviour (owner 200, other Requester 404)', async () => {
    const own = await request(app).get(`/api/attachments/${attachmentId}`).set('Cookie', await cookieFor(ownerEmail));
    const other = await request(app).get(`/api/attachments/${attachmentId}`).set('Cookie', await cookieFor(otherEmail));

    expect(own.status).toBe(200);
    expect(own.body.id).toBe(attachmentId);
    expect(other.status).toBe(404);
  });
});

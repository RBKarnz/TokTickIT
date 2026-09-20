import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('GET /api/tickets/:id', () => {
  let ticketId: number;
  let otherCookie: string;

  beforeAll(async () => {
    const ticket = await prisma.ticket.findFirst({ include: { requester: true } });
    ticketId = ticket?.id || 1;
    const requesterId = ticket?.requesterId || 1;

    const otherRequester = await prisma.user.findFirst({
      where: { id: { not: requesterId }, role: 'REQUESTER', isActive: true },
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: otherRequester?.email || 'requester2@toktickit.com', password: 'Password123!' });
    otherCookie = loginRes.headers['set-cookie']?.[0] || '';
  });

  it('should prevent cross-requester access (403 or 404)', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Cookie', otherCookie);
    expect([403, 404]).toContain(res.status);
  });
});

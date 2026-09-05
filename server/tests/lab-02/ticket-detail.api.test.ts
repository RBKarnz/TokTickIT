import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('GET /api/tickets/:id', () => {
  let ticketId: number;
  let requesterId: number;
  let otherRequesterId: number;

  beforeAll(async () => {
    const ticket = await prisma.ticket.findFirst({ include: { requester: true } });
    ticketId = ticket?.id || 1;
    requesterId = ticket?.requesterId || 1;
    const otherRequester = await prisma.requesterUser.findFirst({ where: { id: { not: requesterId } } });
    otherRequesterId = otherRequester?.id || 2;
  });

  it('should prevent cross-requester access (403 or 404)', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('X-Requester-Id', otherRequesterId.toString());
    expect([403, 404]).toContain(res.status);
  });
});

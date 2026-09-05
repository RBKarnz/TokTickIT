import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('POST /api/tickets', () => {
  let requesterId: number;
  let categoryId: number;
  let systemId: number;

  beforeAll(async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    requesterId = requester?.id || 1;
    categoryId = category?.id || 1;
    systemId = system?.id || 1;
  });

  it('should create a valid ticket and return 201 with ticket number', async () => {
    const payload = {
      categoryId,
      relatedSystemId: systemId,
      requestedPriority: 'MEDIUM',
      summary: 'Test Summary for Ticket',
      description: 'This is a detailed description of the test ticket.'
    };
    const res = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId.toString())
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });
});

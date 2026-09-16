import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('POST /api/tickets', () => {
  let cookie: string;
  let categoryId: number;
  let systemId: number;

  beforeAll(async () => {
    const requester = await prisma.user.findFirst({ where: { isActive: true, role: 'REQUESTER' } });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    categoryId = category?.id || 1;
    systemId = system?.id || 1;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: requester?.email || 'requester1@toktickit.com', password: 'Password123!' });
    cookie = loginRes.headers['set-cookie']?.[0] || '';
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
      .set('Cookie', cookie)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });
});

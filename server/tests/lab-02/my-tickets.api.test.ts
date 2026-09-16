import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('GET /api/tickets', () => {
  let cookie: string;

  beforeAll(async () => {
    const requester = await prisma.user.findFirst({ where: { isActive: true, role: 'REQUESTER' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: requester?.email || 'requester1@toktickit.com', password: 'Password123!' });
    cookie = loginRes.headers['set-cookie']?.[0] || '';
  });

  it('should return paginated tickets', async () => {
    const res = await request(app)
      .get('/api/tickets?page=1&limit=5')
      .set('Cookie', cookie);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });
});

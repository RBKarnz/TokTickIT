import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

describe('GET /api/tickets', () => {
  let requesterId: number;

  beforeAll(async () => {
    const requester = await prisma.requesterUser.findFirst();
    requesterId = requester?.id || 1;
  });

  it('should return paginated tickets', async () => {
    const res = await request(app)
      .get('/api/tickets?page=1&limit=5')
      .set('X-Requester-Id', requesterId.toString());
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });
});

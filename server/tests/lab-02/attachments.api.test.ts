import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';
import fs from 'fs';
import path from 'path';

const prisma = getPrisma();

describe('Attachment APIs', () => {
  let ticketId: number;
  let cookie: string;

  beforeAll(async () => {
    const ticket = await prisma.ticket.findFirst({ include: { requester: true } });
    ticketId = ticket?.id || 1;
    const requester = ticket?.requester || (await prisma.user.findFirst({ where: { role: 'REQUESTER', isActive: true } }));

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: requester?.email || 'requester1@toktickit.com', password: 'Password123!' });
    cookie = loginRes.headers['set-cookie']?.[0] || '';
  });

  it('should reject >5MB attachment (400)', async () => {
    const dummyFilePath = path.join(process.cwd(), 'large-dummy.txt');
    fs.writeFileSync(dummyFilePath, Buffer.alloc(6 * 1024 * 1024)); // 6MB
    
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('Cookie', cookie)
      .attach('file', dummyFilePath);
      
    fs.unlinkSync(dummyFilePath);
    expect(res.status).toBe(400);
  });

  it('should soft-remove attachment (200) and return 404 on download', async () => {
    // create a fake attachment first
    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        originalFilename: 'test.jpg',
        storedFilename: 'test.jpg',
        fileType: 'image/jpeg',
        fileSize: 100
      }
    });

    const delRes = await request(app)
      .delete(`/api/attachments/${attachment.id}`)
      .set('Cookie', cookie)
      .send({ reason: 'Test delete' });
    expect(delRes.status).toBe(200);

    const downRes = await request(app)
      .get(`/api/attachments/${attachment.id}/download`)
      .set('Cookie', cookie);
    expect(downRes.status).toBe(404);
  });
});

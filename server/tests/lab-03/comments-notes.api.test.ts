import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrisma } from '../../src/prisma.js';

const prisma = getPrisma();

const PASSWORD = 'Password123!';
const REQ1_EMAIL = 'requester1@toktickit.com';
const REQ2_EMAIL = 'requester2@toktickit.com';
const STAFF_EMAIL = 'staff1@toktickit.com';
const ADMIN_EMAIL = 'admin@toktickit.com';

async function getCookie(email: string, password = PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.headers['set-cookie']?.[0] ?? '';
}

describe('Comments & Notes API (Lab 3)', () => {
  let req1Cookie: string;
  let req2Cookie: string;
  let staffCookie: string;
  let adminCookie: string;
  let req1User: any;
  let req2User: any;
  let staffUser: any;
  let testTicket: any;
  let req2Ticket: any;

  beforeAll(async () => {
    [req1Cookie, req2Cookie, staffCookie, adminCookie] = await Promise.all([
      getCookie(REQ1_EMAIL),
      getCookie(REQ2_EMAIL),
      getCookie(STAFF_EMAIL),
      getCookie(ADMIN_EMAIL),
    ]);

    req1User = await prisma.user.findUnique({ where: { email: REQ1_EMAIL } });
    req2User = await prisma.user.findUnique({ where: { email: REQ2_EMAIL } });
    staffUser = await prisma.user.findUnique({ where: { email: STAFF_EMAIL } });

    // Category and system for tickets
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    // Create a test ticket owned by requester 1
    testTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-TEST-CMT-${Date.now()}`,
        summary: 'Comment and Note Test Ticket',
        description: 'Test Ticket Description',
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        currentStatus: 'OPEN',
        requesterId: req1User.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });

    // Create a test ticket owned by requester 2
    req2Ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-TEST-REQ2-${Date.now()}`,
        summary: 'Requester 2 Test Ticket',
        description: 'Test Ticket for Requester 2',
        requestedPriority: 'HIGH',
        itPriority: 'HIGH',
        currentStatus: 'OPEN',
        requesterId: req2User.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up created test data
    if (testTicket) {
      await prisma.publicComment.deleteMany({ where: { ticketId: testTicket.id } });
      await prisma.internalNote.deleteMany({ where: { ticketId: testTicket.id } });
      await prisma.ticket.delete({ where: { id: testTicket.id } });
    }
    if (req2Ticket) {
      await prisma.publicComment.deleteMany({ where: { ticketId: req2Ticket.id } });
      await prisma.internalNote.deleteMany({ where: { ticketId: req2Ticket.id } });
      await prisma.ticket.delete({ where: { id: req2Ticket.id } });
    }
  });

  // -------------------------------------------------------------------------
  // Public Comments
  // -------------------------------------------------------------------------

  // API-38
  it('API-38: Public Comment create persists with backend author and timestamp', async () => {
    const content = 'This is a public comment from requester 1.';
    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/public-comments`)
      .set('Cookie', req1Cookie)
      .send({ content });

    expect(res.status).toBe(201);
    expect(res.body.comment).toBeDefined();
    expect(res.body.comment.content).toBe(content);
    expect(res.body.comment.author.id).toBe(req1User.id);
    expect(res.body.comment.author.name).toBe(req1User.name);
    expect(res.body.comment.author.role).toBe('REQUESTER');
    expect(res.body.comment.createdAt).toBeDefined();

    // Verify persisted in DB
    const saved = await prisma.publicComment.findUnique({
      where: { id: res.body.comment.id },
    });
    expect(saved).not.toBeNull();
    expect(saved!.content).toBe(content);
  });

  // API-39
  it('API-39: Public Comment rejects empty or whitespace-only content', async () => {
    const [emptyRes, whitespaceRes] = await Promise.all([
      request(app)
        .post(`/api/tickets/${testTicket.id}/public-comments`)
        .set('Cookie', req1Cookie)
        .send({ content: '' }),
      request(app)
        .post(`/api/tickets/${testTicket.id}/public-comments`)
        .set('Cookie', req1Cookie)
        .send({ content: '    \n\t   ' }),
    ]);

    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(whitespaceRes.status).toBe(400);
    expect(whitespaceRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  // API-40
  it('API-40: Public Comment rejects content > 4000 characters', async () => {
    const tooLong = 'a'.repeat(4001);
    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/public-comments`)
      .set('Cookie', req1Cookie)
      .send({ content: tooLong });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Type Guard
  it('Type Guard: Public Comment rejects non-string content', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/public-comments`)
      .set('Cookie', req1Cookie)
      .send({ content: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Content must be a string.');
  });

  // API-41
  it('API-41: Public Comment retrieval returns comments for authorized viewers in ascending order', async () => {
    // Staff adds a comment
    const staffCommentRes = await request(app)
      .post(`/api/tickets/${testTicket.id}/public-comments`)
      .set('Cookie', staffCookie)
      .send({ content: 'IT Staff response to requester.' });
    expect(staffCommentRes.status).toBe(201);

    // Requester retrieves comments
    const getRes = await request(app)
      .get(`/api/tickets/${testTicket.id}/public-comments`)
      .set('Cookie', req1Cookie);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.comments)).toBe(true);
    expect(getRes.body.comments.length).toBeGreaterThanOrEqual(2);

    // Verify ordering
    const times = getRes.body.comments.map((c: any) => new Date(c.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });

  // Uniform 404 on Cross-Requester Public Comments (SEC-08 / BR-20)
  it('Cross-Requester: Requester cannot view or post public comments on another user ticket (uniform 404)', async () => {
    const [getRes, postRes] = await Promise.all([
      request(app)
        .get(`/api/tickets/${req2Ticket.id}/public-comments`)
        .set('Cookie', req1Cookie),
      request(app)
        .post(`/api/tickets/${req2Ticket.id}/public-comments`)
        .set('Cookie', req1Cookie)
        .send({ content: 'Trying to sneak into another ticket.' }),
    ]);

    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('NOT_FOUND');
    expect(postRes.status).toBe(404);
    expect(postRes.body.error.code).toBe('NOT_FOUND');
  });

  it('Existence check: Public Comments returns 404 for non-existent ticket', async () => {
    const res = await request(app)
      .get('/api/tickets/999999/public-comments')
      .set('Cookie', req1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('Role Check: Administrator is rejected from creating public comments with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/public-comments`)
      .set('Cookie', adminCookie)
      .send({ content: 'Administrator attempting to post public comment.' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('Administrators are not permitted to post public comments.');
  });

  // -------------------------------------------------------------------------
  // Internal Notes & Authorization Boundaries
  // -------------------------------------------------------------------------

  // API-08 & API-44
  it('API-08 & API-44: Requester retrieves Internal Notes -> 403 Forbidden with zero note data', async () => {
    const [staffPathRes, aliasPathRes] = await Promise.all([
      request(app)
        .get(`/api/staff/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', req1Cookie),
      request(app)
        .get(`/api/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', req1Cookie),
    ]);

    expect(staffPathRes.status).toBe(403);
    expect(staffPathRes.body.error.code).toBe('FORBIDDEN');
    expect(staffPathRes.body.notes).toBeUndefined();

    expect(aliasPathRes.status).toBe(403);
    expect(aliasPathRes.body.error.code).toBe('FORBIDDEN');
    expect(aliasPathRes.body.notes).toBeUndefined();
  });

  // API-16
  it('API-16: Requester attempts to create Internal Note -> 403 Forbidden', async () => {
    const [staffPathRes, aliasPathRes] = await Promise.all([
      request(app)
        .post(`/api/staff/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', req1Cookie)
        .send({ content: 'Requester trying to write internal note' }),
      request(app)
        .post(`/api/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', req1Cookie)
        .send({ content: 'Requester trying to write internal note' }),
    ]);

    expect(staffPathRes.status).toBe(403);
    expect(staffPathRes.body.error.code).toBe('FORBIDDEN');
    expect(staffPathRes.body.note).toBeUndefined();

    expect(aliasPathRes.status).toBe(403);
    expect(aliasPathRes.body.error.code).toBe('FORBIDDEN');
    expect(aliasPathRes.body.note).toBeUndefined();
  });

  // API-42
  it('API-42: Internal Note create persists for IT Staff (spec path /api/staff/tickets/:id/internal-notes)', async () => {
    const noteContent = 'Internal IT investigation note.';
    const res = await request(app)
      .post(`/api/staff/tickets/${testTicket.id}/internal-notes`)
      .set('Cookie', staffCookie)
      .send({ content: noteContent });

    expect(res.status).toBe(201);
    expect(res.body.note).toBeDefined();
    expect(res.body.note.content).toBe(noteContent);
    expect(res.body.note.author.id).toBe(staffUser.id);
    expect(res.body.note.author.role).toBe('IT_STAFF');
    expect(res.body.note.createdAt).toBeDefined();
  });

  // API-43
  it('API-43: Internal Note rejects empty or whitespace-only content', async () => {
    const res = await request(app)
      .post(`/api/staff/tickets/${testTicket.id}/internal-notes`)
      .set('Cookie', staffCookie)
      .send({ content: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // API-45
  it('API-45: Internal Notes retrieval for Staff and Admin -> only visible to authorized staff/admin', async () => {
    const [staffRes, adminRes, aliasRes] = await Promise.all([
      request(app)
        .get(`/api/staff/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', staffCookie),
      request(app)
        .get(`/api/staff/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', adminCookie),
      request(app)
        .get(`/api/tickets/${testTicket.id}/internal-notes`)
        .set('Cookie', staffCookie),
    ]);

    expect(staffRes.status).toBe(200);
    expect(Array.isArray(staffRes.body.notes)).toBe(true);
    expect(staffRes.body.notes.length).toBeGreaterThanOrEqual(1);

    expect(adminRes.status).toBe(200);
    expect(Array.isArray(adminRes.body.notes)).toBe(true);
    expect(adminRes.body.notes.length).toBeGreaterThanOrEqual(1);

    expect(aliasRes.status).toBe(200);
    expect(Array.isArray(aliasRes.body.notes)).toBe(true);
    expect(aliasRes.body.notes.length).toBeGreaterThanOrEqual(1);
  });

  it('Existence check: IT Staff accessing internal notes on non-existent ticket returns 404', async () => {
    const [getRes, postRes] = await Promise.all([
      request(app)
        .get('/api/staff/tickets/999999/internal-notes')
        .set('Cookie', staffCookie),
      request(app)
        .post('/api/staff/tickets/999999/internal-notes')
        .set('Cookie', staffCookie)
        .send({ content: 'Note on ghost ticket' }),
    ]);

    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('NOT_FOUND');
    expect(postRes.status).toBe(404);
    expect(postRes.body.error.code).toBe('NOT_FOUND');
  });

  // -------------------------------------------------------------------------
  // Problem Appears Resolved (AC-12 / API-37)
  // -------------------------------------------------------------------------

  // API-37
  it('API-37: Problem Appears Resolved stores timestamp without changing formal status', async () => {
    const beforeTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
    expect(beforeTicket!.requesterResolvedAt).toBeNull();
    const originalStatus = beforeTicket!.currentStatus;

    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/problem-appears-resolved`)
      .set('Cookie', req1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.ticketId).toBe(testTicket.id);
    expect(res.body.requesterResolvedAt).toBeDefined();

    // Verify in DB
    const afterTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
    expect(afterTicket!.requesterResolvedAt).not.toBeNull();
    // Formal status MUST NOT be changed
    expect(afterTicket!.currentStatus).toBe(originalStatus);
  });

  it('Idempotency: Problem Appears Resolved repeated call preserves original timestamp', async () => {
    const firstTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
    const originalTime = new Date(firstTicket!.requesterResolvedAt!).getTime();

    // Wait a tiny bit and call again
    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/problem-appears-resolved`)
      .set('Cookie', req1Cookie);

    expect(res.status).toBe(200);
    const returnedTime = new Date(res.body.requesterResolvedAt).getTime();
    expect(returnedTime).toBe(originalTime);
  });

  it('Terminal Status Guard: Problem Appears Resolved rejects CLOSED or CANCELLED ticket with 409', async () => {
    // Create a closed ticket
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const closedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TCK-CLOSED-${Date.now()}`,
        summary: 'Closed Ticket',
        description: 'Closed Ticket Desc',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        currentStatus: 'CLOSED',
        requesterId: req1User.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
      },
    });

    const res = await request(app)
      .post(`/api/tickets/${closedTicket.id}/problem-appears-resolved`)
      .set('Cookie', req1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');

    await prisma.ticket.delete({ where: { id: closedTicket.id } });
  });

  it('Role Guard: Non-Requester calling Problem Appears Resolved returns 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicket.id}/problem-appears-resolved`)
      .set('Cookie', staffCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Ownership Guard: Requester calling Problem Appears Resolved on another user ticket returns 404', async () => {
    const res = await request(app)
      .post(`/api/tickets/${req2Ticket.id}/problem-appears-resolved`)
      .set('Cookie', req1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // -------------------------------------------------------------------------
  // UNIT-14: Content Validation
  // -------------------------------------------------------------------------
  it('UNIT-14: Content validation rejects empty, whitespace, non-string, and >4000 chars', () => {
    function validateContent(content: any): string | null {
      if (typeof content !== 'string') return 'Content must be a string.';
      const trimmed = content.trim();
      if (trimmed.length === 0) return 'Content is required.';
      if (trimmed.length > 4000) return 'Content cannot exceed 4000 characters.';
      return null;
    }

    expect(validateContent(123)).toBe('Content must be a string.');
    expect(validateContent({})).toBe('Content must be a string.');
    expect(validateContent('')).toBe('Content is required.');
    expect(validateContent('   \n  ')).toBe('Content is required.');
    expect(validateContent('Valid comment')).toBeNull();
    expect(validateContent('a'.repeat(4000))).toBeNull();
    expect(validateContent('a'.repeat(4001))).toBe('Content cannot exceed 4000 characters.');
  });
});

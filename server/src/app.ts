import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPrisma } from "./prisma.js";
import {
  requireAuth,
  requireNormalAuth,
  requireRole,
  createSession,
  revokeSession,
  revokeAllUserSessions,
  hashToken,
  hashPassword,
  verifyPassword,
  dummyVerify,
  validatePasswordPolicy,
  COOKIE_NAME,
  getCookieOptions,
} from './auth.js';

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.'));
    }
  }
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API"
  });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// ---------------------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const prisma = getPrisma();

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" } });
  }
});

// Lab 2: Get active related systems
app.get('/api/systems', async (req, res) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    });
    res.status(200).json(systems);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch systems" } });
  }
});

// Lab 2: Get active requesters (uses User model after Lab 3 migration)
app.get('/api/requesters', async (req, res) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: { isActive: true, role: 'REQUESTER' },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { id: 'asc' }
    });
    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch requesters" } });
  }
});

// ---------------------------------------------------------------------------
// Lab 3: Authentication Endpoints
// ---------------------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Email and password are required.' }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const prisma = getPrisma();
    const SAFE_ERROR = { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } };

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always run a hash operation to prevent timing attacks (BR-05b)
    if (!user || !user.isActive) {
      await dummyVerify(password);
      return res.status(401).json(SAFE_ERROR);
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) return res.status(401).json(SAFE_ERROR);

    const token = await createSession(user.id);
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(COOKIE_NAME, token, getCookieOptions(isSecure));

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error('Login error (no credentials logged)');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred.' } });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await revokeSession(hashToken(token));
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
  const u = req.sessionUser!;
  return res.status(200).json({
    user: { id: u.id, name: u.name, email: u.email, role: u.role, mustChangePassword: u.mustChangePassword }
  });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.sessionUser!.id;
    const prisma = getPrisma();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'All password fields are required.' } });
    }

    if (newPassword !== confirmPassword) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', fieldErrors: { confirmPassword: 'Passwords do not match.' } }
      });
    }

    const policyErr = validatePasswordPolicy(newPassword);
    if (policyErr) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', fieldErrors: { newPassword: policyErr } }
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session invalid.' } });

    const currentValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!currentValid) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', fieldErrors: { currentPassword: 'Current password is incorrect.' } }
      });
    }

    const sameAsCurrent = await verifyPassword(user.passwordHash, newPassword.trim());
    if (sameAsCurrent) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', fieldErrors: { newPassword: 'New password must differ from current password.' } }
      });
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // Invalidate all existing sessions for this user (including current restricted session)
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      // Clear mustChangePassword + store new hash
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, mustChangePassword: false },
      });
    });

    // Rotate session: issue a new normal authenticated session token and cookie
    const newToken = await createSession(userId);
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(COOKIE_NAME, newToken, getCookieOptions(isSecure));

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change-password error (no credentials logged)');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred.' } });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Ticket Endpoints (Migrated to Lab 3 Session Auth)
// ---------------------------------------------------------------------------

// Create a ticket
app.post('/api/tickets', requireNormalAuth, requireRole('REQUESTER'), async (req, res) => {
  const requesterId = req.sessionUser!.id;
  const { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body;

  if (!categoryId || !relatedSystemId || !requestedPriority || !summary || !description) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing required fields" } });
  }

  if (summary.length < 5 || summary.length > 100) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Summary must be between 5 and 100 characters" } });
  }

  if (description.length < 10) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Description must be at least 10 characters" } });
  }

  try {
    const prisma = getPrisma();
    
    // Generate ticket number safely based on max existing sequence for the year
    const year = new Date().getFullYear();
    const existingYearTickets = await prisma.ticket.findMany({
      where: {
        ticketNumber: {
          startsWith: `TKT-${year}-`,
        },
      },
      select: { ticketNumber: true },
    });

    let maxNum = 0;
    for (const t of existingYearTickets) {
      const match = t.ticketNumber.match(/^TKT-\d{4}-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const ticketNumber = `TKT-${year}-${String(maxNum + 1).padStart(6, '0')}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: parseInt(categoryId),
        relatedSystemId: parseInt(relatedSystemId),
        requestedPriority,
        summary,
        description,
        currentStatus: "NEW",
        itPriority: requestedPriority, // Initialize itPriority from requestedPriority per Lab 3
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create ticket" } });
  }
});

// Get tickets for the active requester (My Tickets)
app.get('/api/tickets', requireNormalAuth, requireRole('REQUESTER'), async (req, res) => {
  const requesterId = req.sessionUser!.id;
  const { search, categoryId, status, sort, startDate, endDate, page = '1', limit = '10' } = req.query;

  try {
    const prisma = getPrisma();
    
    // Build the where clause
    const whereClause: any = { requesterId };

    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search as string, mode: 'insensitive' } },
        { summary: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      whereClause.categoryId = parseInt(categoryId as string);
    }

    if (status) {
      whereClause.currentStatus = status as string;
    }
    
    // Date Range Filter (by updatedAt)
    if (startDate || endDate) {
      whereClause.updatedAt = {};
      if (startDate) {
        whereClause.updatedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        // To include the whole end day, set to 23:59:59.999
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        whereClause.updatedAt.lte = end;
      }
    }

    // Determine sorting
    let orderBy: any = { updatedAt: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'priority') orderBy = { requestedPriority: 'desc' };
    if (sort === 'priority_asc') orderBy = { requestedPriority: 'asc' };

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const [totalCount, tickets] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limitNumber,
        include: {
          category: { select: { name: true } }
        }
      })
    ]);

    res.status(200).json({
      data: tickets,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber) || 1
      }
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch tickets" } });
  }
});

app.get('/api/tickets/:id', requireNormalAuth, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid ticket ID" } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        attachments: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    // Requester can only access own ticket; return 404 Not Found to prevent ticket enumeration
    if (req.sessionUser!.role === 'REQUESTER' && ticket.requesterId !== req.sessionUser!.id) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch ticket details" } });
  }
});

// Attachment endpoints
app.post('/api/tickets/:id/attachments', requireNormalAuth, requireRole('REQUESTER'), (req, res, next) => {
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'File too large (>5MB)' } });
      }
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
    } else if (err) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: err.message } });
    }
    next();
  });
}, async (req, res) => {
  const requesterId = req.sessionUser!.id;
  const ticketId = parseInt(req.params.id);

  if (!req.file) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "No file uploaded" } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { attachments: { where: { isRemoved: false } } }
    });

    if (!ticket || ticket.requesterId !== requesterId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    if (ticket.attachments.length >= 5) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Max 5 active attachments reached" } });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      }
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to upload attachment" } });
  }
});

async function getOwnedAttachment(id: number, requesterId: number): Promise<
  | { error: { status: number; code: string; message: string }; attachment: null }
  | { error: null; attachment: any }
> {
  const attachment = await getPrisma().attachment.findUnique({
    where: { id },
    include: { ticket: true },
  });
  if (!attachment || attachment.isRemoved || attachment.ticket.requesterId !== requesterId) {
    return { error: { status: 404, code: 'NOT_FOUND', message: 'Attachment not found' }, attachment: null };
  }
  return { error: null, attachment };
}

app.get('/api/attachments/:id', requireNormalAuth, requireRole('REQUESTER'), async (req, res) => {
  try {
    const result = await getOwnedAttachment(parseInt(req.params.id), req.sessionUser!.id);
    if (result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    res.json(result.attachment);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch attachment" } });
  }
});

app.get('/api/attachments/:id/download', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role === 'ADMINISTRATOR') {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Forbidden" } });
  }
  try {
    const attachmentId = parseInt(req.params.id);
    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });
    if (!attachment || attachment.isRemoved) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
    }
    if (req.sessionUser!.role === 'REQUESTER' && attachment.ticket.requesterId !== req.sessionUser!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
    }

    const filePath = path.join(process.cwd(), 'uploads', attachment.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "File missing on disk" } });
    }
    res.download(filePath, attachment.originalFilename);
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to download attachment" } });
  }
});

app.delete('/api/attachments/:id', requireNormalAuth, requireRole('REQUESTER'), async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim() === '') {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Removal reason is required" } });
  }

  try {
    const attachmentId = parseInt(req.params.id);
    const result = await getOwnedAttachment(attachmentId, req.sessionUser!.id);
    if (result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });

    await getPrisma().attachment.update({
      where: { id: attachmentId },
      data: { isRemoved: true, removalReason: reason, removedAt: new Date() }
    });
    res.json({ message: "Attachment removed successfully" });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to remove attachment" } });
  }
});

// ---------------------------------------------------------------------------
// Comments and Notes (Lab 3)
// ---------------------------------------------------------------------------

// POST /api/tickets/:id/public-comments
app.post('/api/tickets/:id/public-comments', requireNormalAuth, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  if (typeof req.body.content !== 'string') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Content must be a string.' } });
  }

  const content = req.body.content.trim();
  if (content.length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } });
  }
  if (content.length > 4000) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Content cannot exceed 4000 characters.' } });
  }

  if (req.sessionUser!.role === 'ADMINISTRATOR') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrators are not permitted to post public comments.' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    if (req.sessionUser!.role === 'REQUESTER' && ticket.requesterId !== req.sessionUser!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const comment = await prisma.publicComment.create({
      data: {
        ticketId,
        authorId: req.sessionUser!.id,
        content,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Error creating public comment:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create comment' } });
  }
});

// GET /api/tickets/:id/public-comments
app.get('/api/tickets/:id/public-comments', requireNormalAuth, async (req, res) => {
  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    if (req.sessionUser!.role === 'REQUESTER' && ticket.requesterId !== req.sessionUser!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching public comments:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch comments' } });
  }
});

// ---------------------------------------------------------------------------
// Internal Notes (Mounted under /api/staff/tickets/:id/internal-notes per spec,
// with /api/tickets/:id/internal-notes alias for compatibility)
// ---------------------------------------------------------------------------

const handleCreateInternalNote = async (req: express.Request, res: express.Response) => {
  if (req.sessionUser!.role === 'REQUESTER') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Requesters are not permitted to access internal notes.' } });
  }

  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  if (typeof req.body.content !== 'string') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Content must be a string.' } });
  }

  const content = req.body.content.trim();
  if (content.length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required.' } });
  }
  if (content.length > 4000) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Content cannot exceed 4000 characters.' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        authorId: req.sessionUser!.id,
        content,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    console.error('Error creating internal note:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create internal note' } });
  }
};

app.post('/api/staff/tickets/:id/internal-notes', requireNormalAuth, handleCreateInternalNote);
app.post('/api/tickets/:id/internal-notes', requireNormalAuth, handleCreateInternalNote);

const handleGetInternalNotes = async (req: express.Request, res: express.Response) => {
  if (req.sessionUser!.role === 'REQUESTER') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Requesters are not permitted to access internal notes.' } });
  }

  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ notes });
  } catch (error) {
    console.error('Error fetching internal notes:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch internal notes' } });
  }
};

app.get('/api/staff/tickets/:id/internal-notes', requireNormalAuth, handleGetInternalNotes);
app.get('/api/tickets/:id/internal-notes', requireNormalAuth, handleGetInternalNotes);

// POST /api/tickets/:id/problem-appears-resolved
app.post('/api/tickets/:id/problem-appears-resolved', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'REQUESTER') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only requesters can perform this action.' } });
  }

  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== req.sessionUser!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    if (ticket.currentStatus === 'CLOSED' || ticket.currentStatus === 'CANCELLED') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Cannot mark a closed or cancelled ticket as resolved.' } });
    }

    let resolvedAt = ticket.requesterResolvedAt;
    if (!resolvedAt) {
      resolvedAt = new Date();
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { requesterResolvedAt: resolvedAt },
      });
    }

    res.json({ ticketId, requesterResolvedAt: resolvedAt });
  } catch (error) {
    console.error('Error marking problem as resolved:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to mark problem as resolved' } });
  }
});

// Status display mappings per Lab 3 specification
export const STATUS_TO_LABEL: Record<string, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

export const LABEL_TO_STATUS: Record<string, string> = {
  ...Object.entries(STATUS_TO_LABEL).reduce(
    (acc, [k, v]) => ({ ...acc, [v.toLowerCase()]: k, [k.toLowerCase()]: k }),
    {} as Record<string, string>
  ),
  waiting_on_requester: 'WAITING_FOR_REQUESTER',
  'waiting on requester': 'WAITING_FOR_REQUESTER',
};

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

// GET /api/staff/tickets/:id - Detailed ticket view for IT Staff and Administrator
app.get('/api/staff/tickets/:id', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role === 'REQUESTER') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Requesters cannot access staff ticket operations.' } });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        attachments: { orderBy: { uploadedAt: 'desc' } },
        publicComments: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        internalNotes: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error fetching staff ticket detail:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch ticket detail' } });
  }
});

// POST /api/staff/tickets/:id/claim - Claim unassigned ticket (AC-09)
app.post('/api/staff/tickets/:id/claim', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'IT_STAFF') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only IT Staff can claim tickets.' } });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    if (ticket.ownerId !== null) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Ticket is already claimed.' } });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ownerId: req.sessionUser!.id },
      include: { owner: { select: { id: true, name: true } } },
    });

    res.status(200).json({ owner: updated.owner });
  } catch (error) {
    console.error('Error claiming ticket:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to claim ticket' } });
  }
});

// PUT /api/staff/tickets/:id/owner - Assign/reassign ticket to active IT Staff (AC-09)
app.put('/api/staff/tickets/:id/owner', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'IT_STAFF') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only IT Staff can assign tickets.' } });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  const ownerId = typeof req.body.ownerId === 'string' ? parseInt(req.body.ownerId, 10) : req.body.ownerId;
  if (typeof ownerId !== 'number' || isNaN(ownerId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Valid ownerId is required.' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!targetUser || !targetUser.isActive || targetUser.role !== 'IT_STAFF') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Target owner must be an active IT Staff member.' } });
    }

    if (ticket.ownerId === targetUser.id) {
      return res.status(200).json({ owner: { id: targetUser.id, name: targetUser.name } });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ownerId: targetUser.id },
      include: { owner: { select: { id: true, name: true } } },
    });

    res.status(200).json({ owner: updated.owner });
  } catch (error) {
    console.error('Error assigning ticket owner:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to assign ticket owner' } });
  }
});

// PATCH /api/staff/tickets/:id/it-priority - Update IT Priority independently (AC-10)
app.patch('/api/staff/tickets/:id/it-priority', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'IT_STAFF') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only IT Staff can update IT priority.' } });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  const priorityStr = typeof req.body.itPriority === 'string' ? req.body.itPriority.trim().toUpperCase() : '';
  const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (!allowedPriorities.includes(priorityStr)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'itPriority must be LOW, MEDIUM, HIGH, or CRITICAL.' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: priorityStr as any },
      select: { id: true, itPriority: true, requestedPriority: true },
    });

    res.status(200).json({ ticketId: updated.id, itPriority: updated.itPriority, requestedPriority: updated.requestedPriority });
  } catch (error) {
    console.error('Error updating IT priority:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update IT priority' } });
  }
});

// POST /api/staff/tickets/:id/status - Execute status transitions enforcing matrix (AC-11)
app.post('/api/staff/tickets/:id/status', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'IT_STAFF') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only IT Staff can change ticket status.' } });
  }

  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ticket ID' } });
  }

  if (!req.body.status || typeof req.body.status !== 'string') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Status is required.' } });
  }

  const normalizedTarget = LABEL_TO_STATUS[req.body.status.trim().toLowerCase()];
  if (!normalizedTarget) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid status value.' } });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    }

    // Self-transition check
    if (normalizedTarget === ticket.currentStatus) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Ticket is already in the requested status.' } });
    }

    // Allowed transition matrix check
    const allowedNext = ALLOWED_STATUS_TRANSITIONS[ticket.currentStatus] || [];
    if (!allowedNext.includes(normalizedTarget)) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `Invalid status transition from ${ticket.currentStatus} to ${normalizedTarget}.`,
        },
      });
    }

    // Resolution summary requirement when transitioning to RESOLVED
    if (normalizedTarget === 'RESOLVED') {
      if (!req.body.resolutionSummary || typeof req.body.resolutionSummary !== 'string' || !req.body.resolutionSummary.trim()) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Resolution summary is required when resolving a ticket.' } });
      }
    }

    const dataToUpdate: any = { currentStatus: normalizedTarget };
    if (req.body.resolutionSummary && typeof req.body.resolutionSummary === 'string') {
      dataToUpdate.resolutionSummary = req.body.resolutionSummary.trim();
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: dataToUpdate,
      select: { id: true, currentStatus: true, resolutionSummary: true },
    });

    res.status(200).json({
      ticketId: updated.id,
      currentStatus: updated.currentStatus,
      resolutionSummary: updated.resolutionSummary,
    });
  } catch (error) {
    console.error('Error changing ticket status:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to change ticket status' } });
  }
});

// GET /api/staff/users - Active IT Staff users for dropdowns
app.get('/api/staff/users', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'IT_STAFF' && req.sessionUser!.role !== 'ADMINISTRATOR') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
  }

  try {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { role: 'IT_STAFF', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching staff users:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch staff users' } });
  }
});

// GET /api/staff/tickets - IT Staff Ticket Queue with search, filters, sorting & pagination
app.get('/api/staff/tickets', requireNormalAuth, async (req, res) => {
  if (req.sessionUser!.role !== 'IT_STAFF') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only IT Staff can access the ticket queue.' } });
  }

  try {
    let page = 1;
    let pageSize = 20;
    let sortBy = 'updatedAt';
    let sortOrder: 'asc' | 'desc' = 'desc';

    // Type-guards & Query Parameter Validations (API-26)
    if (req.query.search !== undefined) {
      if (typeof req.query.search !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid search parameter.' } });
      }
    }

    if (req.query.page !== undefined) {
      if (typeof req.query.page !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid page parameter.' } });
      }
      const parsedPage = parseInt(req.query.page, 10);
      if (isNaN(parsedPage) || parsedPage < 1 || String(parsedPage) !== req.query.page.trim()) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid page parameter.' } });
      }
      page = parsedPage;
    }

    if (req.query.pageSize !== undefined) {
      if (typeof req.query.pageSize !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid pageSize parameter.' } });
      }
      const parsedPageSize = parseInt(req.query.pageSize, 10);
      if (![10, 20, 50].includes(parsedPageSize) || String(parsedPageSize) !== req.query.pageSize.trim()) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'pageSize must be 10, 20, or 50.' } });
      }
      pageSize = parsedPageSize;
    }

    let mappedStatus: string | undefined;
    if (req.query.status !== undefined) {
      if (typeof req.query.status !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid status parameter.' } });
      }
      mappedStatus = LABEL_TO_STATUS[req.query.status.trim().toLowerCase()];
      if (!mappedStatus) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid status parameter.' } });
      }
    }

    let requestedPriority: string | undefined;
    if (req.query.requestedPriority !== undefined) {
      if (typeof req.query.requestedPriority !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid requestedPriority parameter.' } });
      }
      const normalizedPriority = req.query.requestedPriority.trim().toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(normalizedPriority)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid requestedPriority parameter.' } });
      }
      requestedPriority = normalizedPriority;
    }

    let itPriority: string | undefined;
    if (req.query.itPriority !== undefined) {
      if (typeof req.query.itPriority !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid itPriority parameter.' } });
      }
      const normalizedItPriority = req.query.itPriority.trim().toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSIGNED'].includes(normalizedItPriority)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid itPriority parameter.' } });
      }
      itPriority = normalizedItPriority;
    }

    let ownership: string | undefined;
    if (req.query.ownership !== undefined) {
      if (typeof req.query.ownership !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ownership parameter.' } });
      }
      const normalizedOwnership = req.query.ownership.trim().toLowerCase();
      if (!['assigned', 'unassigned'].includes(normalizedOwnership)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'ownership must be assigned or unassigned.' } });
      }
      ownership = normalizedOwnership;
    }

    let parsedOwnerId: number | undefined;
    if (req.query.ownerId !== undefined) {
      if (typeof req.query.ownerId !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ownerId parameter.' } });
      }
      parsedOwnerId = parseInt(req.query.ownerId, 10);
      if (isNaN(parsedOwnerId) || parsedOwnerId < 1 || String(parsedOwnerId) !== req.query.ownerId.trim()) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid ownerId parameter.' } });
      }
    }

    if (req.query.sort !== undefined && typeof req.query.sort === 'string') {
      const s = req.query.sort.trim();
      if (s === 'updated_desc') { sortBy = 'updatedAt'; sortOrder = 'desc'; }
      else if (s === 'newest') { sortBy = 'createdAt'; sortOrder = 'desc'; }
      else if (s === 'oldest') { sortBy = 'createdAt'; sortOrder = 'asc'; }
      else if (s === 'priority') { sortBy = 'itPriority'; sortOrder = 'desc'; }
      else if (s === 'priority_asc') { sortBy = 'itPriority'; sortOrder = 'asc'; }
    }

    if (req.query.sortBy !== undefined) {
      if (typeof req.query.sortBy !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid sortBy parameter.' } });
      }
      const allowedSort = ['createdAt', 'updatedAt', 'requestedPriority', 'itPriority', 'status', 'ticketNumber', 'category', 'owner'];
      if (!allowedSort.includes(req.query.sortBy.trim())) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid sortBy parameter.' } });
      }
      sortBy = req.query.sortBy.trim();
    }

    if (req.query.sortOrder !== undefined) {
      if (typeof req.query.sortOrder !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid sortOrder parameter.' } });
      }
      const normalizedOrder = req.query.sortOrder.trim().toLowerCase();
      if (!['asc', 'desc'].includes(normalizedOrder)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'sortOrder must be asc or desc.' } });
      }
      sortOrder = normalizedOrder as 'asc' | 'desc';
    }

    // Build Where Clause
    const where: any = {};

    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const searchTerm = req.query.search.trim();
      where.OR = [
        { ticketNumber: { contains: searchTerm, mode: 'insensitive' } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (req.query.categoryId !== undefined) {
      if (typeof req.query.categoryId !== 'string') {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid categoryId parameter.' } });
      }
      const parsedCatId = parseInt(req.query.categoryId, 10);
      if (!isNaN(parsedCatId)) {
        where.categoryId = parsedCatId;
      }
    }

    if (req.query.startDate || req.query.endDate) {
      where.updatedAt = {};
      if (req.query.startDate && typeof req.query.startDate === 'string') {
        where.updatedAt.gte = new Date(req.query.startDate);
      }
      if (req.query.endDate && typeof req.query.endDate === 'string') {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        where.updatedAt.lte = end;
      }
    }

    if (mappedStatus) {
      where.currentStatus = mappedStatus;
    }

    if (requestedPriority) {
      where.requestedPriority = requestedPriority;
    }

    if (itPriority) {
      where.itPriority = itPriority;
    }

    if (ownership === 'assigned') {
      where.ownerId = { not: null };
    } else if (ownership === 'unassigned') {
      where.ownerId = null;
    }

    if (parsedOwnerId !== undefined) {
      where.ownerId = parsedOwnerId;
    }

    // Deterministic Sorting with Secondary Tie-Breaker
    let primaryOrder: any;
    if (sortBy === 'status') {
      primaryOrder = { currentStatus: sortOrder };
    } else if (sortBy === 'category') {
      primaryOrder = { category: { name: sortOrder } };
    } else if (sortBy === 'owner') {
      primaryOrder = { owner: { name: sortOrder } };
    } else {
      primaryOrder = { [sortBy]: sortOrder };
    }

    const orderBy: any[] = [primaryOrder];
    if (sortBy !== 'ticketNumber') {
      orderBy.push({ ticketNumber: 'desc' });
    }

    const prisma = getPrisma();
    const [totalItems, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    const items = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      summary: t.summary,
      category: t.category?.name || 'Uncategorized',
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: STATUS_TO_LABEL[t.currentStatus] || t.currentStatus,
      owner: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
    }));

    res.status(200).json({
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching staff tickets:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch staff tickets' } });
  }
});

// ---------------------------------------------------------------------------
// Issue Lab 3 — Administrator User Management
// ---------------------------------------------------------------------------

const ADMIN_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_VALID_ROLES = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];

// GET /api/admin/users
app.get('/api/admin/users', requireNormalAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  try {
    const prisma = getPrisma();

    // Query validation
    if (req.query.role !== undefined) {
      if (typeof req.query.role !== 'string' || !ADMIN_VALID_ROLES.includes(req.query.role.trim())) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role query parameter.' } });
      }
    }

    const where: any = {};

    if (typeof req.query.search === 'string' && req.query.search.trim().length > 0) {
      const q = req.query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (typeof req.query.role === 'string' && req.query.role.trim().length > 0) {
      where.role = req.query.role.trim();
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    res.status(200).json({ items: users });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users.' } });
  }
});

// POST /api/admin/users
app.post('/api/admin/users', requireNormalAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  try {
    const { name, email, role, isActive, initialPassword, confirmInitialPassword } = req.body;

    // Type-guards & required fields
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name is required.' } });
    }
    if (typeof email !== 'string' || email.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required.' } });
    }
    if (typeof role !== 'string' || role.trim().length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Role is required.' } });
    }
    if (typeof initialPassword !== 'string' || initialPassword.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Initial password is required.' } });
    }
    if (typeof confirmInitialPassword !== 'string' || confirmInitialPassword.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Confirm initial password is required.' } });
    }

    // isActive validation (if provided, must be boolean; no silent coercion)
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'isActive must be a boolean.' } });
    }

    // Role enum check (returns 422 per api-spec.md Section 9 line 596)
    const trimmedRole = role.trim();
    if (!ADMIN_VALID_ROLES.includes(trimmedRole)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role specified.' } });
    }

    // Email format validation
    const canonicalEmail = email.trim().toLowerCase();
    if (!ADMIN_EMAIL_REGEX.test(canonicalEmail)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format.' } });
    }

    // Passwords match check
    if (initialPassword !== confirmInitialPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match.' } });
    }

    // Password policy check
    const policyError = validatePasswordPolicy(initialPassword);
    if (policyError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: policyError } });
    }

    const prisma = getPrisma();

    // Duplicate email check (global across active and inactive accounts)
    const existing = await prisma.user.findUnique({ where: { email: canonicalEmail } });
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email is already registered.' } });
    }

    const passwordHash = await hashPassword(initialPassword);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: canonicalEmail,
        role: trimmedRole as any,
        isActive: isActive !== undefined ? isActive : true,
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create user.' } });
  }
});

// PATCH /api/admin/users/:userId
app.patch('/api/admin/users/:userId', requireNormalAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid user ID.' } });
    }

    const { name, email, role, isActive } = req.body;

    // Check that at least one field is provided
    if (name === undefined && email === undefined && role === undefined && isActive === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one field must be provided for update.' } });
    }

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    const updateData: any = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name cannot be empty.' } });
      }
      updateData.name = name.trim();
    }

    // Validate email
    if (email !== undefined) {
      if (typeof email !== 'string') {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email must be a string.' } });
      }
      const canonicalEmail = email.trim().toLowerCase();
      if (!ADMIN_EMAIL_REGEX.test(canonicalEmail)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format.' } });
      }
      const existing = await prisma.user.findUnique({ where: { email: canonicalEmail } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email is already in use.' } });
      }
      updateData.email = canonicalEmail;
    }

    // Validate role
    if (role !== undefined) {
      if (typeof role !== 'string') {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Role must be a string.' } });
      }
      const trimmedRole = role.trim();
      if (!ADMIN_VALID_ROLES.includes(trimmedRole)) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role specified.' } });
      }
      updateData.role = trimmedRole;
    }

    // Validate isActive
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'isActive must be a boolean.' } });
      }
      updateData.isActive = isActive;
    }

    // AC-18: Self-deactivation restriction
    if (isActive === false && req.sessionUser!.id === targetUser.id) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Administrators cannot deactivate their own account.' } });
    }

    // AC-18: Last active Administrator protection (both deactivation and role demotion)
    if (targetUser.role === 'ADMINISTRATOR' && targetUser.isActive === true) {
      const willBeInactive = isActive === false;
      const willChangeRoleAway = role !== undefined && role.trim() !== 'ADMINISTRATOR';

      if (willBeInactive || willChangeRoleAway) {
        const activeAdminCount = await prisma.user.count({
          where: { role: 'ADMINISTRATOR', isActive: true },
        });
        if (activeAdminCount <= 1) {
          return res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: 'Cannot deactivate or change the role of the last active Administrator in the system.',
            },
          });
        }
      }
    }

    // Session revocation when deactivating user (SEC-12)
    if (isActive === false) {
      await revokeAllUserSessions(targetUser.id);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user.' } });
  }
});

// POST /api/admin/users/:userId/set-initial-password
app.post('/api/admin/users/:userId/set-initial-password', requireNormalAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid user ID.' } });
    }

    const { initialPassword, confirmInitialPassword } = req.body;

    if (typeof initialPassword !== 'string' || initialPassword.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Initial password is required.' } });
    }
    if (typeof confirmInitialPassword !== 'string' || confirmInitialPassword.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Confirm initial password is required.' } });
    }

    if (initialPassword !== confirmInitialPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Passwords do not match.' } });
    }

    const policyError = validatePasswordPolicy(initialPassword);
    if (policyError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: policyError } });
    }

    const prisma = getPrisma();
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }

    const passwordHash = await hashPassword(initialPassword);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Revoke all existing sessions for target user (SEC-12)
    await revokeAllUserSessions(targetUser.id);

    res.status(200).json({
      message: 'Initial password set successfully. User will be required to change password on next login.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error setting initial password:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to set initial password.' } });
  }
});

export default app;


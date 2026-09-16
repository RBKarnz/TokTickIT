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
        error: { code: 'VALIDATION_ERROR', fieldErrors: { confirmPassword: 'Passwords do not match.' } }
      });
    }

    const policyErr = validatePasswordPolicy(newPassword);
    if (policyErr) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', fieldErrors: { newPassword: policyErr } }
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session invalid.' } });

    const currentValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!currentValid) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', fieldErrors: { currentPassword: 'Current password is incorrect.' } }
      });
    }

    const sameAsCurrent = await verifyPassword(user.passwordHash, newPassword.trim());
    if (sameAsCurrent) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', fieldErrors: { newPassword: 'New password must differ from current password.' } }
      });
    }

    const newHash = await hashPassword(newPassword);
    const currentTokenHash = req.sessionTokenHash!;

    await prisma.$transaction(async (tx) => {
      // Revoke all OTHER sessions for this user
      await tx.session.updateMany({
        where: { userId, revokedAt: null, tokenHash: { not: currentTokenHash } },
        data: { revokedAt: new Date() },
      });
      // Clear mustChangePassword + store new hash
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, mustChangePassword: false },
      });
    });

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
    
    // Generate ticket number: e.g. TKT-2026-000001
    const count = await prisma.ticket.count();
    const year = new Date().getFullYear();
    const ticketNumber = `TKT-${year}-${String(count + 1).padStart(6, '0')}`;

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

app.get('/api/tickets/:id', requireNormalAuth, requireRole('REQUESTER'), async (req, res) => {
  const requesterId = req.sessionUser!.id;
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
        requester: true,
        attachments: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to view this ticket" } });
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

    if (!ticket) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    }

    if (ticket.requesterId !== requesterId) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not ticket owner" } });
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
  if (!attachment || attachment.isRemoved) {
    return { error: { status: 404, code: 'NOT_FOUND', message: 'Attachment not found' }, attachment: null };
  }
  if (attachment.ticket.requesterId !== requesterId) {
    return { error: { status: 403, code: 'FORBIDDEN', message: 'Not ticket owner' }, attachment: null };
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

app.get('/api/attachments/:id/download', requireNormalAuth, requireRole('REQUESTER'), async (req, res) => {
  try {
    const result = await getOwnedAttachment(parseInt(req.params.id), req.sessionUser!.id);
    if (result.error) return res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });

    const filePath = path.join(process.cwd(), 'uploads', result.attachment.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "File missing on disk" } });
    }
    res.download(filePath, result.attachment.originalFilename);
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

export default app;

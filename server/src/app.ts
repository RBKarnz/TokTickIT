import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API"
  });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------

app.get('/api/categories', async (req, res) => {
  try {
    // เรียกใช้ getPrisma() เพื่อดึงการเชื่อมต่อ Database มาใช้งาน
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

// Lab 2: Get active requesters
app.get('/api/requesters', async (req, res) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, isActive: true },
      orderBy: { id: 'asc' }
    });
    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch requesters" } });
  }
});

// Lab 2: Create a ticket
app.post('/api/tickets', async (req, res) => {
  const requesterIdHeader = req.headers['x-requester-id'];
  if (!requesterIdHeader) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing X-Requester-Id header" } });
  }

  const requesterId = parseInt(requesterIdHeader as string);
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
        itPriority: "UNASSIGNED",
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create ticket" } });
  }
});

export default app;

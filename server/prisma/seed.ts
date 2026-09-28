import { getPrisma } from "../src/prisma.js";
import * as argon2 from "argon2";

const SEED_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Password123!";

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  const prisma = getPrisma();
  const passwordHash = await hashPassword(SEED_PASSWORD);

  console.log("Hashed seed password with Argon2id.");

  // -------------------------------------------------------------------------
  // Categories (4 required — preserved from Lab 2)
  // -------------------------------------------------------------------------
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }
  console.log("Categories seeded.");

  // -------------------------------------------------------------------------
  // Related Systems (7 — preserved from Lab 2)
  // -------------------------------------------------------------------------
  const systems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of systems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }
  console.log("Related systems seeded.");

  // -------------------------------------------------------------------------
  // Users — 11 seed accounts
  // Map legacy Lab 2 emails to official Lab 3 seed accounts by updating email
  // (Preserving user IDs, tickets, and attachments without duplication)
  // -------------------------------------------------------------------------
  const legacyEmailMap: Record<string, string> = {
    "jennifer.a@example.com": "requester1@toktickit.com",
    "michael.b@example.com": "requester2@toktickit.com",
    "sarah.j@example.com": "requester3@toktickit.com",
    "david.l@example.com": "requester4@toktickit.com",
    "inactive@example.com": "requester.inactive@toktickit.com",
  };

  for (const [oldEmail, newEmail] of Object.entries(legacyEmailMap)) {
    const legacyUser = await prisma.user.findUnique({ where: { email: oldEmail } });
    if (legacyUser) {
      const existingNewUser = await prisma.user.findUnique({ where: { email: newEmail } });
      if (existingNewUser && existingNewUser.id !== legacyUser.id) {
        // Re-point any tickets or comments from existingNewUser to legacyUser before merging
        await prisma.ticket.updateMany({ where: { requesterId: existingNewUser.id }, data: { requesterId: legacyUser.id } });
        await prisma.ticket.updateMany({ where: { ownerId: existingNewUser.id }, data: { ownerId: legacyUser.id } });
        await prisma.publicComment.updateMany({ where: { authorId: existingNewUser.id }, data: { authorId: legacyUser.id } });
        await prisma.internalNote.updateMany({ where: { authorId: existingNewUser.id }, data: { authorId: legacyUser.id } });
        await prisma.session.deleteMany({ where: { userId: existingNewUser.id } });
        await prisma.user.delete({ where: { id: existingNewUser.id } });
      }
      // Update legacy user record to official Lab 3 email
      await prisma.user.update({
        where: { id: legacyUser.id },
        data: { email: newEmail }
      });
      console.log(`Updated legacy user ${oldEmail} -> ${newEmail} (preserved ID: ${legacyUser.id})`);
    }
  }

  const users = [
    // 4 active Requesters
    { name: "Jennifer Anderson", email: "requester1@toktickit.com", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    { name: "Michael Brown", email: "requester2@toktickit.com", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    { name: "Sarah Johnson", email: "requester3@toktickit.com", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    { name: "David Lee", email: "requester4@toktickit.com", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    // 1 inactive Requester
    { name: "Inactive Requester", email: "requester.inactive@toktickit.com", role: "REQUESTER" as const, isActive: false, mustChangePassword: false },
    // 3 active IT Staff
    { name: "Alice Tech", email: "staff1@toktickit.com", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false },
    { name: "Bob Support", email: "staff2@toktickit.com", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false },
    { name: "Charlie Ops", email: "staff3@toktickit.com", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false },
    // 1 inactive IT Staff
    { name: "Inactive Staff", email: "staff.inactive@toktickit.com", role: "IT_STAFF" as const, isActive: false, mustChangePassword: false },
    // 1 active Administrator
    { name: "Admin User", email: "admin@toktickit.com", role: "ADMINISTRATOR" as const, isActive: true, mustChangePassword: false },
    // 1 first-login test user
    { name: "First Login User", email: "firstlogin@toktickit.com", role: "REQUESTER" as const, isActive: true, mustChangePassword: true },
  ];

  const seededUsers: Record<string, { id: number }> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: u.isActive, mustChangePassword: u.mustChangePassword, passwordHash },
      create: { ...u, passwordHash },
    });
    seededUsers[u.email] = user;
  }
  console.log(`Users seeded: ${Object.keys(seededUsers).length} accounts.`);

  // -------------------------------------------------------------------------
  // Fetch lookup data
  // -------------------------------------------------------------------------
  const dbCategories = await prisma.category.findMany();
  const dbSystems = await prisma.relatedSystem.findMany();

  const catAccount = dbCategories.find(c => c.name === "Account and Access")!;
  const catHardware = dbCategories.find(c => c.name === "Hardware")!;
  const catSoftware = dbCategories.find(c => c.name === "Software")!;
  const catNetwork = dbCategories.find(c => c.name === "Network")!;

  const sysEmail = dbSystems.find(s => s.name === "Email")!;
  const sysWifi = dbSystems.find(s => s.name === "Campus Wi-Fi")!;
  const sysPrinter = dbSystems.find(s => s.name === "Printer")!;
  const sysVpn = dbSystems.find(s => s.name === "VPN")!;
  const sysLaptop = dbSystems.find(s => s.name === "Corporate Laptop")!;

  const jennifer = seededUsers["requester1@toktickit.com"];
  const michael = seededUsers["requester2@toktickit.com"];
  const sarah = seededUsers["requester3@toktickit.com"];
  // david has 0 tickets intentionally

  const staff1 = seededUsers["staff1@toktickit.com"];
  const staff2 = seededUsers["staff2@toktickit.com"];

  // -------------------------------------------------------------------------
  // Helper functions
  // -------------------------------------------------------------------------
  const getRandomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  const augustFirst = new Date("2026-08-01T00:00:00Z");
  const today = new Date("2026-09-01T00:00:00Z");
  const statuses: Array<"NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED"> = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
  ];
  const priorities: Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  // Use a deterministic seed approach to make tickets stable across re-runs
  // by using upsert on ticketNumber
  let ticketCounter = 1;
  const getTicketNo = () => `TKT-2026-${String(ticketCounter++).padStart(6, "0")}`;

  // Simple seeded random (deterministic for consistent re-runs)
  let seedRng = 42;
  const seededRandom = () => {
    seedRng = (seedRng * 16807 + 0) % 2147483647;
    return (seedRng - 1) / 2147483646;
  };
  const pick = <T>(arr: T[]): T => arr[Math.floor(seededRandom() * arr.length)];
  const getSeededDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + seededRandom() * (end.getTime() - start.getTime()));
  };

  // -------------------------------------------------------------------------
  // Tickets — Jennifer: 128 tickets
  // -------------------------------------------------------------------------
  const jenniferCategories = dbCategories.filter(c => c.name !== "Network");

  console.log("Seeding 128 tickets for Jennifer...");
  for (let i = 0; i < 128; i++) {
    const cat = pick(jenniferCategories);
    const sys = pick(dbSystems);
    const prio = pick(priorities);
    const status = pick(statuses);
    const ticketNumber = getTicketNo();

    const createdAt = getSeededDate(augustFirst, new Date(today.getTime() - 86400000 * 2));
    const updatedAt = status === "NEW" ? createdAt : getSeededDate(createdAt, today);

    // Assign some tickets to staff for testing
    const ownerId = i < 30 ? staff1.id : i < 50 ? staff2.id : null;

    await prisma.ticket.upsert({
      where: { ticketNumber },
      update: {
        ...(ownerId ? { ownerId } : {}),
        itPriority: prio, // Ensure itPriority is populated from requestedPriority (BR-29)
        ...(status === "RESOLVED" ? { resolutionSummary: "Issue investigated and resolved by IT support team. Verified operational stability." } : {}),
      },
      create: {
        ticketNumber,
        requesterId: jennifer.id,
        ownerId,
        categoryId: cat.id,
        relatedSystemId: sys.id,
        requestedPriority: prio,
        itPriority: prio, // Initialize itPriority from requestedPriority (BR-29)
        currentStatus: status,
        resolutionSummary: status === "RESOLVED" ? "Issue investigated and resolved by IT support team. Verified operational stability." : null,
        summary: `System Issue Report #${i + 1}`,
        description: `Automatically generated seed ticket for load testing.`,
        createdAt,
        updatedAt,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Tickets — Michael: 25 tickets
  // -------------------------------------------------------------------------
  console.log("Seeding 25 tickets for Michael...");
  for (let i = 0; i < 25; i++) {
    const cat = pick(dbCategories);
    const sys = pick(dbSystems);
    const prio = pick(priorities);
    const status = pick(statuses);
    const ticketNumber = getTicketNo();

    const createdAt = getSeededDate(augustFirst, today);
    const updatedAt = status === "NEW" ? createdAt : getSeededDate(createdAt, today);

    const ownerId = i < 5 ? staff1.id : null;

    await prisma.ticket.upsert({
      where: { ticketNumber },
      update: {
        ...(ownerId ? { ownerId } : {}),
        itPriority: prio, // Ensure itPriority is populated from requestedPriority (BR-29)
        ...(status === "RESOLVED" ? { resolutionSummary: "Resolved by IT staff following standard operating procedure." } : {}),
      },
      create: {
        ticketNumber,
        requesterId: michael.id,
        ownerId,
        categoryId: cat.id,
        relatedSystemId: sys.id,
        requestedPriority: prio,
        itPriority: prio,
        currentStatus: status,
        resolutionSummary: status === "RESOLVED" ? "Resolved by IT staff following standard operating procedure." : null,
        summary: `Support Request #${i + 1}`,
        description: `Automatically generated seed ticket for pagination testing.`,
        createdAt,
        updatedAt,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Tickets — Sarah: 2 specific tickets
  // -------------------------------------------------------------------------
  const sarahTickets = [
    {
      ticketNumber: getTicketNo(),
      catId: catSoftware.id,
      sysId: sysEmail.id,
      priority: "HIGH" as const,
      status: "NEW" as const,
      summary: "Email sync issue",
      ownerId: null as number | null,
    },
    {
      ticketNumber: getTicketNo(),
      catId: catHardware.id,
      sysId: sysPrinter.id,
      priority: "MEDIUM" as const,
      status: "RESOLVED" as const,
      summary: "Monitor won't turn on",
      ownerId: staff2.id,
    },
  ];

  for (const t of sarahTickets) {
    const createdAt = getSeededDate(augustFirst, today);
    const updatedAt = t.status === "NEW" ? createdAt : getSeededDate(createdAt, today);
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        ...(t.ownerId ? { ownerId: t.ownerId } : {}),
        itPriority: t.priority, // Ensure itPriority is populated from requestedPriority (BR-29)
        ...(t.status === "RESOLVED" ? { resolutionSummary: "Diagnosed and resolved hardware issue. Replaced memory module and verified stability across 2 stress-test passes." } : {}),
      },
      create: {
        ticketNumber: t.ticketNumber,
        requesterId: sarah.id,
        ownerId: t.ownerId,
        categoryId: t.catId,
        relatedSystemId: t.sysId,
        requestedPriority: t.priority,
        itPriority: t.priority,
        currentStatus: t.status,
        resolutionSummary: t.status === "RESOLVED" ? "Diagnosed and resolved hardware issue. Replaced memory module and verified stability across 2 stress-test passes." : null,
        summary: t.summary,
        description: `This is a test ticket for ${t.summary}`,
        createdAt,
        updatedAt,
      },
    });
  }
  // David has 0 tickets intentionally.

  console.log("Tickets seeded.");

  // -------------------------------------------------------------------------
  // Public Comments — sample data on a few tickets
  // -------------------------------------------------------------------------
  const sampleTickets = await prisma.ticket.findMany({
    take: 5,
    orderBy: { id: "asc" },
  });

  for (const ticket of sampleTickets.slice(0, 3)) {
    // Check if this ticket already has comments (idempotency)
    const existingComments = await prisma.publicComment.count({
      where: { ticketId: ticket.id },
    });

    if (existingComments === 0) {
      await prisma.publicComment.create({
        data: {
          ticketId: ticket.id,
          authorId: ticket.requesterId,
          content: "I am experiencing this issue frequently. Please help.",
        },
      });

      if (ticket.ownerId) {
        await prisma.publicComment.create({
          data: {
            ticketId: ticket.id,
            authorId: ticket.ownerId,
            content: "Thank you for reporting. We are looking into this issue.",
          },
        });
      }
    }
  }
  console.log("Public comments seeded.");

  // -------------------------------------------------------------------------
  // Internal Notes — sample data on a few tickets
  // -------------------------------------------------------------------------
  for (const ticket of sampleTickets.slice(0, 2)) {
    const existingNotes = await prisma.internalNote.count({
      where: { ticketId: ticket.id },
    });

    if (existingNotes === 0 && ticket.ownerId) {
      await prisma.internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: ticket.ownerId,
          content: "Checked server logs. Possible configuration issue on the backend.",
        },
      });
    }
  }
  console.log("Internal notes seeded.");

  // -------------------------------------------------------------------------
  // Lab 4 fixtures — Actions Taken and status history (BR-36, AC-22)
  // Fixed ticket numbers "TKT-2026-L4-NNN" are ignored by the ticket-number
  // generator (it only counts TKT-YYYY-<digits>), so API numbering is unchanged.
  // Dates are in July 2026, before every Lab 2-3 seed ticket, so the fixtures
  // never become the first row of a list sorted by updatedAt (Lab 3 E2E).
  // Zero metrics by design: requester4 (David) has no Tickets and staff3
  // (Charlie) owns no Ticket and has no Action assigned.
  // -------------------------------------------------------------------------
  const admin = seededUsers["admin@toktickit.com"];
  const at = (day: number, hour: number) => new Date(Date.UTC(2026, 6, day, hour, 0, 0));

  type FixtureAction = {
    performedById: number;
    assignedToId: number;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    description: string;
    result?: string;
    followUpNote?: string;
  };
  type Fixture = {
    ticketNumber: string;
    summary: string;
    ownerId: number;
    itPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    path: Array<"NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED">;
    resolutionSummary?: string;
    actions: FixtureAction[];
  };

  const lab4Fixtures: Fixture[] = [
    {
      ticketNumber: "TKT-2026-L4-001", summary: "Lab 4 fixture: no actions yet", ownerId: staff1.id, itPriority: "LOW",
      path: ["NEW", "OPEN"], actions: [],
    },
    {
      ticketNumber: "TKT-2026-L4-002", summary: "Lab 4 fixture: one planned action", ownerId: staff1.id, itPriority: "MEDIUM",
      path: ["NEW", "OPEN", "IN_PROGRESS"],
      actions: [
        { performedById: staff1.id, assignedToId: staff1.id, status: "PLANNED", description: "Check the VPN client version on the laptop." },
      ],
    },
    {
      ticketNumber: "TKT-2026-L4-003", summary: "Lab 4 fixture: many actions by different staff", ownerId: staff1.id, itPriority: "HIGH",
      path: ["NEW", "OPEN", "IN_PROGRESS"],
      actions: [
        { performedById: staff1.id, assignedToId: staff2.id, status: "COMPLETED", description: "Collected network logs from the access point.", result: "Logs show repeated DHCP timeouts." },
        { performedById: staff2.id, assignedToId: staff2.id, status: "IN_PROGRESS", description: "Replacing the faulty access point in building 3." },
        { performedById: admin.id, assignedToId: staff1.id, status: "CANCELLED", description: "Vendor escalation, not needed after the log review." },
      ],
    },
    {
      ticketNumber: "TKT-2026-L4-004", summary: "Lab 4 fixture: ready for resolution", ownerId: staff2.id, itPriority: "MEDIUM",
      path: ["NEW", "OPEN", "IN_PROGRESS"],
      actions: [
        { performedById: staff2.id, assignedToId: staff2.id, status: "COMPLETED", description: "Reset the mailbox rules.", result: "Mail sync works on desktop and mobile." },
      ],
    },
    {
      ticketNumber: "TKT-2026-L4-005", summary: "Lab 4 fixture: pending follow-up blocks resolution", ownerId: staff1.id, itPriority: "CRITICAL",
      path: ["NEW", "OPEN", "IN_PROGRESS"],
      actions: [
        { performedById: staff1.id, assignedToId: staff1.id, status: "COMPLETED", description: "Restored access to the grade submission app.", result: "Access restored for the requester." },
        { performedById: staff1.id, assignedToId: staff2.id, status: "PLANNED", description: "Confirm the fix with the faculty office.", followUpNote: "Call the faculty office after the next grade upload." },
      ],
    },
    {
      ticketNumber: "TKT-2026-L4-006", summary: "Lab 4 fixture: waiting for requester", ownerId: staff2.id, itPriority: "HIGH",
      path: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"],
      actions: [
        { performedById: staff2.id, assignedToId: staff2.id, status: "IN_PROGRESS", description: "Waiting for the requester to test the new printer driver.", followUpNote: "Ask the requester to print a test page." },
      ],
    },
    {
      ticketNumber: "TKT-2026-L4-007", summary: "Lab 4 fixture: resolved with completed actions", ownerId: staff1.id, itPriority: "LOW",
      path: ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED"],
      resolutionSummary: "Replaced the laptop charger; the laptop charges normally.",
      actions: [
        { performedById: staff1.id, assignedToId: staff1.id, status: "COMPLETED", description: "Tested the laptop with a spare charger.", result: "Laptop charges with the spare charger." },
        { performedById: staff2.id, assignedToId: staff2.id, status: "COMPLETED", description: "Issued a new charger to the requester.", result: "Charger handed over." },
      ],
    },
    {
      ticketNumber: "TKT-2026-L4-008", summary: "Lab 4 fixture: closed", ownerId: staff2.id, itPriority: "MEDIUM",
      path: ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      resolutionSummary: "Password reset completed and verified with the requester.",
      actions: [
        { performedById: staff2.id, assignedToId: staff2.id, status: "COMPLETED", description: "Reset the account password.", result: "Requester signed in successfully." },
      ],
    },
  ];

  for (const [index, f] of lab4Fixtures.entries()) {
    const day = index + 1; // 1..8 July 2026, one day per fixture
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: f.ticketNumber },
      update: {},
      create: {
        ticketNumber: f.ticketNumber,
        requesterId: sarah.id,
        ownerId: f.ownerId,
        categoryId: catSoftware.id,
        relatedSystemId: sysLaptop.id,
        requestedPriority: f.itPriority,
        itPriority: f.itPriority,
        currentStatus: f.path[f.path.length - 1],
        resolutionSummary: f.resolutionSummary ?? null,
        summary: f.summary,
        description: `${f.summary}. Seeded for Lab 4 Actions Taken, workflow and dashboard tests.`,
        createdAt: at(day, 1),
        updatedAt: at(day, f.path.length),
      },
    });

    // Full status path, written once (history is append-only).
    if ((await prisma.ticketStatusHistory.count({ where: { ticketId: ticket.id } })) === 0) {
      await prisma.ticketStatusHistory.createMany({
        data: f.path.map((toStatus, step) => ({
          ticketId: ticket.id,
          fromStatus: step === 0 ? null : f.path[step - 1],
          toStatus,
          changedById: step === 0 ? null : f.ownerId,
          reason: step === 0 ? "Ticket created" : "Seeded workflow step",
          createdAt: at(day, step + 1),
        })),
      });
    }

    // Upsert on (ticketId, idempotencyKey) keeps Actions repeat-safe.
    for (const [n, a] of f.actions.entries()) {
      const idempotencyKey = `seed-${f.ticketNumber}-${n + 1}`;
      await prisma.actionTaken.upsert({
        where: { ticketId_idempotencyKey: { ticketId: ticket.id, idempotencyKey } },
        update: {},
        create: {
          ticketId: ticket.id,
          performedById: a.performedById,
          assignedToId: a.assignedToId,
          actionAt: at(day, 2 + n),
          description: a.description,
          result: a.result ?? null,
          status: a.status,
          followUpRequired: a.followUpNote !== undefined,
          followUpNote: a.followUpNote ?? null,
          idempotencyKey,
        },
      });
    }
  }
  console.log(`Lab 4 fixtures seeded: ${lab4Fixtures.length} tickets.`);

  // -------------------------------------------------------------------------
  // Initial status history for every Ticket that has none (BR-34): covers
  // Tickets seeded on a fresh database and Tickets created through the API.
  // -------------------------------------------------------------------------
  const ticketsWithoutHistory = await prisma.ticket.findMany({
    where: { statusHistory: { none: {} } },
    select: { id: true, currentStatus: true, ownerId: true, updatedAt: true },
  });
  if (ticketsWithoutHistory.length > 0) {
    await prisma.ticketStatusHistory.createMany({
      data: ticketsWithoutHistory.map((t) => ({
        ticketId: t.id,
        fromStatus: null,
        toStatus: t.currentStatus,
        changedById: t.ownerId,
        reason: "Initial status (seed backfill)",
        createdAt: t.updatedAt,
      })),
    });
  }
  console.log(`Initial status history added for ${ticketsWithoutHistory.length} tickets.`);

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    systems: await prisma.relatedSystem.count(),
    tickets: await prisma.ticket.count(),
    attachments: await prisma.attachment.count(),
    publicComments: await prisma.publicComment.count(),
    internalNotes: await prisma.internalNote.count(),
    actionsTaken: await prisma.actionTaken.count(),
    statusHistory: await prisma.ticketStatusHistory.count(),
  };

  console.log("Seeding completed successfully.");
  console.log("Row counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

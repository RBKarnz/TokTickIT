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
      update: { name: u.name, role: u.role, isActive: u.isActive, mustChangePassword: u.mustChangePassword },
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
  const statuses: Array<"NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "WAITING_FOR_REQUESTER" | "REOPENED" | "CANCELLED"> = [
    "NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED",
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
        ...(ownerId ? { ownerId } : {})
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
        ...(ownerId ? { ownerId } : {})
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
        ...(t.ownerId ? { ownerId: t.ownerId } : {})
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

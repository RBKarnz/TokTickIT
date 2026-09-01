import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();
  
  // Categories (4 required)
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

  // Related Systems (6+ realistic)
  const systems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop"
  ];

  for (const name of systems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  // Requesters (4 active, 1 inactive)
  const requesters = [
    { name: "Jennifer Anderson", email: "jennifer.a@example.com", isActive: true },
    { name: "Michael Brown", email: "michael.b@example.com", isActive: true },
    { name: "Sarah Johnson", email: "sarah.j@example.com", isActive: true },
    { name: "David Lee", email: "david.l@example.com", isActive: true },
    { name: "Inactive User", email: "inactive@example.com", isActive: false }
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: { name: req.name, isActive: req.isActive },
      create: req,
    });
  }

  // Fetch all requesters, categories, and systems from DB to get their real IDs
  const dbRequesters = await prisma.requesterUser.findMany();
  const dbCategories = await prisma.category.findMany();
  const dbSystems = await prisma.relatedSystem.findMany();

  const jennifer = dbRequesters.find(r => r.name === "Jennifer Anderson");
  const michael = dbRequesters.find(r => r.name === "Michael Brown");
  const sarah = dbRequesters.find(r => r.name === "Sarah Johnson");
  const david = dbRequesters.find(r => r.name === "David Lee");

  const catAccount = dbCategories.find(c => c.name === "Account and Access")!;
  const catHardware = dbCategories.find(c => c.name === "Hardware")!;
  const catSoftware = dbCategories.find(c => c.name === "Software")!;
  // Network category is intentionally omitted for Jennifer to test empty filters

  const sysEmail = dbSystems.find(s => s.name === "Email")!;
  const sysWifi = dbSystems.find(s => s.name === "Campus Wi-Fi")!;
  const sysPrinter = dbSystems.find(s => s.name === "Printer")!;

  // Clear existing tickets to avoid duplication on re-seed
  await prisma.ticket.deleteMany({});

  if (jennifer && michael && sarah) {
    let ticketCounter = 1;
    const getTicketNo = () => `TKT-2026-${String(ticketCounter++).padStart(6, '0')}`;

    // Helper to generate a random date between start and end
    const getRandomDate = (start: Date, end: Date) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    };

    const augustFirst = new Date('2026-08-01T00:00:00Z');
    const today = new Date('2026-09-01T00:00:00Z');

    // Jennifer's 15 tickets
    const jenniferTicketsRaw = [
      // Hardware
      { catId: catHardware.id, sysId: sysPrinter.id, priority: "LOW", status: "NEW", summary: "Printer paper jam" },
      { catId: catHardware.id, sysId: sysPrinter.id, priority: "LOW", status: "IN_PROGRESS", summary: "Need new toner" },
      { catId: catHardware.id, sysId: sysPrinter.id, priority: "MEDIUM", status: "RESOLVED", summary: "Printer not responding" },
      { catId: catHardware.id, sysId: sysPrinter.id, priority: "HIGH", status: "NEW", summary: "Printer smells like smoke" },
      
      // Account
      { catId: catAccount.id, sysId: sysEmail.id, priority: "HIGH", status: "NEW", summary: "Forgot email password" },
      { catId: catAccount.id, sysId: sysEmail.id, priority: "MEDIUM", status: "IN_PROGRESS", summary: "Can't login to email" },
      { catId: catAccount.id, sysId: sysWifi.id, priority: "LOW", status: "CLOSED", summary: "Guest wifi access" },
      { catId: catAccount.id, sysId: sysEmail.id, priority: "HIGH", status: "NEW", summary: "Account locked out" }, // duplicate combo
      { catId: catAccount.id, sysId: sysEmail.id, priority: "HIGH", status: "OPEN", summary: "Account hacked" },
      
      // Software
      { catId: catSoftware.id, sysId: sysEmail.id, priority: "LOW", status: "NEW", summary: "Outlook keeps crashing" },
      { catId: catSoftware.id, sysId: sysEmail.id, priority: "MEDIUM", status: "RESOLVED", summary: "How to add signature" },
      { catId: catSoftware.id, sysId: sysWifi.id, priority: "LOW", status: "IN_PROGRESS", summary: "Wi-Fi disconnecting randomly" },
      { catId: catSoftware.id, sysId: sysWifi.id, priority: "LOW", status: "NEW", summary: "Slow internet speed" },
      { catId: catSoftware.id, sysId: sysEmail.id, priority: "MEDIUM", status: "NEW", summary: "Spam emails increasing" },
      { catId: catSoftware.id, sysId: sysPrinter.id, priority: "MEDIUM", status: "CLOSED", summary: "Printer driver installation" }
    ];

    for (const t of jenniferTicketsRaw) {
      const createdAt = getRandomDate(augustFirst, new Date(today.getTime() - 86400000 * 2)); // Create up to 2 days ago
      // If status is NEW, updatedAt is same as createdAt. Else, updated recently.
      const updatedAt = t.status === "NEW" ? createdAt : getRandomDate(createdAt, today);
      
      await prisma.ticket.create({
        data: {
          ticketNumber: getTicketNo(),
          requesterId: jennifer.id,
          categoryId: t.catId,
          relatedSystemId: t.sysId,
          requestedPriority: t.priority as any,
          currentStatus: t.status as any,
          summary: t.summary,
          description: `This is a test ticket for ${t.summary}`,
          createdAt,
          updatedAt
        }
      });
    }

    // Michael's 3 tickets
    const michaelTicketsRaw = [
      { catId: catHardware.id, sysId: sysPrinter.id, priority: "MEDIUM", status: "NEW", summary: "Broken mouse" },
      { catId: catAccount.id, sysId: sysEmail.id, priority: "CRITICAL", status: "OPEN", summary: "Cannot access server" },
      { catId: catSoftware.id, sysId: sysWifi.id, priority: "LOW", status: "CLOSED", summary: "Update required" }
    ];

    for (const t of michaelTicketsRaw) {
      const createdAt = getRandomDate(augustFirst, today);
      const updatedAt = t.status === "NEW" ? createdAt : getRandomDate(createdAt, today);
      await prisma.ticket.create({
        data: {
          ticketNumber: getTicketNo(),
          requesterId: michael.id,
          categoryId: t.catId,
          relatedSystemId: t.sysId,
          requestedPriority: t.priority as any,
          currentStatus: t.status as any,
          summary: t.summary,
          description: `This is a test ticket for ${t.summary}`,
          createdAt,
          updatedAt
        }
      });
    }

    // Sarah's 2 tickets
    const sarahTicketsRaw = [
      { catId: catSoftware.id, sysId: sysEmail.id, priority: "HIGH", status: "NEW", summary: "Email sync issue" },
      { catId: catHardware.id, sysId: sysPrinter.id, priority: "MEDIUM", status: "RESOLVED", summary: "Monitor won't turn on" }
    ];

    for (const t of sarahTicketsRaw) {
      const createdAt = getRandomDate(augustFirst, today);
      const updatedAt = t.status === "NEW" ? createdAt : getRandomDate(createdAt, today);
      await prisma.ticket.create({
        data: {
          ticketNumber: getTicketNo(),
          requesterId: sarah.id,
          categoryId: t.catId,
          relatedSystemId: t.sysId,
          requestedPriority: t.priority as any,
          currentStatus: t.status as any,
          summary: t.summary,
          description: `This is a test ticket for ${t.summary}`,
          createdAt,
          updatedAt
        }
      });
    }
    
    // David has 0 tickets intentionally.
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });

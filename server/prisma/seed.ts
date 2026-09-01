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

    const statuses = ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    
    // Jennifer: 128 tickets
    const jenniferCategories = dbCategories.filter(c => c.name !== "Network"); // Exclude Network
    const jenniferPriorities = ["LOW", "MEDIUM", "HIGH"]; // Exclude CRITICAL
    
    console.log("Seeding 128 tickets for Jennifer...");
    for (let i = 0; i < 128; i++) {
      const cat = jenniferCategories[Math.floor(Math.random() * jenniferCategories.length)];
      const sys = dbSystems[Math.floor(Math.random() * dbSystems.length)];
      const prio = jenniferPriorities[Math.floor(Math.random() * jenniferPriorities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const createdAt = getRandomDate(augustFirst, new Date(today.getTime() - 86400000 * 2));
      const updatedAt = status === "NEW" ? createdAt : getRandomDate(createdAt, today);
      
      await prisma.ticket.create({
        data: {
          ticketNumber: getTicketNo(),
          requesterId: jennifer.id,
          categoryId: cat.id,
          relatedSystemId: sys.id,
          requestedPriority: prio as any,
          currentStatus: status as any,
          summary: `System Issue Report #${i + 1}`,
          description: `Automatically generated seed ticket for load testing.`,
          createdAt,
          updatedAt
        }
      });
    }

    // Michael: 25 tickets
    console.log("Seeding 25 tickets for Michael...");
    const allPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    for (let i = 0; i < 25; i++) {
      const cat = dbCategories[Math.floor(Math.random() * dbCategories.length)];
      const sys = dbSystems[Math.floor(Math.random() * dbSystems.length)];
      const prio = allPriorities[Math.floor(Math.random() * allPriorities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const createdAt = getRandomDate(augustFirst, today);
      const updatedAt = status === "NEW" ? createdAt : getRandomDate(createdAt, today);
      
      await prisma.ticket.create({
        data: {
          ticketNumber: getTicketNo(),
          requesterId: michael.id,
          categoryId: cat.id,
          relatedSystemId: sys.id,
          requestedPriority: prio as any,
          currentStatus: status as any,
          summary: `Support Request #${i + 1}`,
          description: `Automatically generated seed ticket for pagination testing.`,
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

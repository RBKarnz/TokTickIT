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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../src/prisma.js';

// API-61..64: runs the real Prisma migrations against a disposable database.
// Lab 1-2 migrations are applied first, Lab 2 data is inserted, then the Lab 3
// migration is applied and the preserved data is checked. The test database is
// dropped afterwards; the development database is never modified.
const TEST_DB = 'toktickit_migration_test';
const SERVER_DIR = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(SERVER_DIR, 'prisma/migrations');
const LAB2_MIGRATIONS = ['20260808084043_create_category_table', '20260828151338_init_lab2'];
const LAB3_MIGRATION = '20260913004050_lab3_users_auth';

type TicketRow = { id: number; ticketNumber: string; requesterEmail: string; requestedPriority: string; itPriority: string; currentStatus: string };
type AttachmentRow = { id: number; ticketId: number; storedFilename: string };

describe('Migration / Regression Tests (Lab 3 API-61..64)', () => {
  const admin = getPrisma();
  let testUrl: string;
  let tmpDir: string;
  let db: PrismaClient;
  let ticketsBefore: TicketRow[];
  let attachmentsBefore: AttachmentRow[];
  let requestersBefore: { email: string; isActive: boolean }[];

  const deploy = () => execSync(`npx prisma migrate deploy --schema "${path.join(tmpDir, 'schema.prisma')}"`, {
    cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'pipe',
  }).toString();
  const copyMigration = (name: string) => fs.cpSync(path.join(MIGRATIONS_DIR, name), path.join(tmpDir, 'migrations', name), { recursive: true });
  const counts = async () => ({
    users: await db.user.count(), tickets: await db.ticket.count(), attachments: await db.attachment.count(),
    categories: await db.category.count(), systems: await db.relatedSystem.count(),
  });

  beforeAll(async () => {
    await admin.$connect(); // loads DATABASE_URL from server/.env into process.env
    const base = process.env.DATABASE_URL;
    if (!base) throw new Error('DATABASE_URL is not set');
    const url = new URL(base);
    url.pathname = `/${TEST_DB}`;
    testUrl = url.toString();

    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB}"`);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toktickit-migration-'));
    fs.copyFileSync(path.join(SERVER_DIR, 'prisma/schema.prisma'), path.join(tmpDir, 'schema.prisma'));
    fs.mkdirSync(path.join(tmpDir, 'migrations'));
    fs.copyFileSync(path.join(MIGRATIONS_DIR, 'migration_lock.toml'), path.join(tmpDir, 'migrations/migration_lock.toml'));
    LAB2_MIGRATIONS.forEach(copyMigration);
    deploy();

    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    // Lab 2 data, including an un-normalised email, an inactive requester and UNASSIGNED IT Priority.
    const sql = [
      `INSERT INTO "Category" ("id","name") VALUES (901,'Mig Hardware'),(902,'Mig Software')`,
      `INSERT INTO "RelatedSystem" ("id","name") VALUES (901,'Mig Printer'),(902,'Mig Email')`,
      `INSERT INTO "RequesterUser" ("id","name","email","isActive") VALUES
         (11,'Legacy One','  Legacy.One@Example.com ',true),(12,'Legacy Two','legacy.two@example.com',true),
         (13,'Legacy Inactive','legacy.inactive@example.com',false)`,
      `INSERT INTO "Ticket" ("id","ticketNumber","requesterId","categoryId","relatedSystemId","requestedPriority","itPriority","currentStatus","summary","description","updatedAt") VALUES
         (501,'MIG-000501',11,901,901,'HIGH','UNASSIGNED','NEW','Printer jam','Lab 2 ticket',NOW()),
         (502,'MIG-000502',11,902,902,'LOW','UNASSIGNED','OPEN','Mail sync','Lab 2 ticket',NOW()),
         (503,'MIG-000503',12,901,902,'MEDIUM','CRITICAL','IN_PROGRESS','Already triaged','Lab 2 ticket',NOW()),
         (504,'MIG-000504',12,902,901,'CRITICAL','UNASSIGNED','RESOLVED','Resolved one','Lab 2 ticket',NOW()),
         (505,'MIG-000505',13,901,901,'MEDIUM','UNASSIGNED','CLOSED','Inactive requester ticket','Lab 2 ticket',NOW())`,
      `INSERT INTO "Attachment" ("id","ticketId","originalFilename","storedFilename","fileType","fileSize") VALUES
         (701,501,'a.pdf','file-701.pdf','application/pdf',100),(702,501,'b.png','file-702.png','image/png',200),
         (703,504,'c.pdf','file-703.pdf','application/pdf',300)`,
    ];
    for (const s of sql) await db.$executeRawUnsafe(s);

    ticketsBefore = await db.$queryRawUnsafe<TicketRow[]>(`
      SELECT t."id", t."ticketNumber", LOWER(TRIM(r."email")) AS "requesterEmail", t."requestedPriority"::text AS "requestedPriority",
             t."itPriority"::text AS "itPriority", t."currentStatus"::text AS "currentStatus"
      FROM "Ticket" t JOIN "RequesterUser" r ON r."id" = t."requesterId" ORDER BY t."id"`);
    attachmentsBefore = await db.$queryRawUnsafe<AttachmentRow[]>(`SELECT "id","ticketId","storedFilename" FROM "Attachment" ORDER BY "id"`);
    requestersBefore = await db.$queryRawUnsafe(`SELECT LOWER(TRIM("email")) AS "email", "isActive" FROM "RequesterUser" ORDER BY "id"`);

    // The copied schema.prisma is the current one, so the Lab 3 migration and every later
    // (additive) migration are applied together; the seed in API-64 needs the current tables.
    fs.readdirSync(MIGRATIONS_DIR).filter((name) => /^\d{14}_/.test(name) && name >= LAB3_MIGRATION).forEach(copyMigration);
    deploy();
  }, 180_000);

  afterAll(async () => {
    await db?.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}" WITH (FORCE)`);
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('API-61: migration preserves every Ticket (count, IDs, numbers, statuses) and initialises IT Priority (BR-29)', async () => {
    const after = await db.ticket.findMany({ orderBy: { id: 'asc' } });
    expect(after.map((t) => [t.id, t.ticketNumber, t.currentStatus])).toEqual(ticketsBefore.map((t) => [t.id, t.ticketNumber, t.currentStatus]));
    for (const before of ticketsBefore) {
      const t = after.find((x) => x.id === before.id)!;
      expect(t.itPriority).toBe(before.itPriority === 'UNASSIGNED' ? before.requestedPriority : before.itPriority);
      expect(t.ownerId).toBeNull();
    }
  });

  it('API-62: migration preserves Attachment relations and file metadata', async () => {
    const after = await db.attachment.findMany({ orderBy: { id: 'asc' }, include: { ticket: true } });
    expect(after.map((a) => ({ id: a.id, ticketId: a.ticketId, storedFilename: a.storedFilename }))).toEqual(attachmentsBefore);
    after.forEach((a) => expect(a.ticket).not.toBeNull());
  });

  it('API-63: each Lab 2 requester becomes exactly one REQUESTER User and keeps ownership of the same Tickets', async () => {
    const users = await db.user.findMany();
    expect(users).toHaveLength(requestersBefore.length);
    for (const r of requestersBefore) {
      const u = users.find((x) => x.email === r.email)!;
      expect(u).toBeDefined();
      expect(u.role).toBe('REQUESTER');
      expect(u.isActive).toBe(r.isActive);
      expect(u.mustChangePassword).toBe(true);
      expect(u.passwordHash).toMatch(/^\$argon2id\$/);
    }
    const after = await db.ticket.findMany({ include: { requester: true }, orderBy: { id: 'asc' } });
    expect(after.map((t) => t.requester.email)).toEqual(ticketsBefore.map((t) => t.requesterEmail));
    const legacyTable = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_name = 'RequesterUser'`);
    expect(Number(legacyTable[0].n)).toBe(0);
  });

  it('API-64: migrate and seed are repeat-safe — a second run creates no duplicates and changes nothing', async () => {
    expect(deploy()).toMatch(/No pending migrations/);
    const seed = () => execSync('npx tsx prisma/seed.ts', { cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'pipe' });

    seed();
    const afterFirst = await counts();
    seed();
    const afterSecond = await counts();

    expect(afterSecond).toEqual(afterFirst);
    // Migrated Lab 2 rows are still there after seeding.
    expect(await db.ticket.count({ where: { ticketNumber: { startsWith: 'MIG-' } } })).toBe(ticketsBefore.length);
    expect(await db.attachment.count({ where: { id: { in: attachmentsBefore.map((a) => a.id) } } })).toBe(attachmentsBefore.length);
  }, 240_000);
});

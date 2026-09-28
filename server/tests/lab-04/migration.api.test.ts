import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../src/prisma.js';

// MIG-01..05 (AC-21, AC-22): runs the real Prisma migrations against a disposable database.
// Lab 1-3 migrations are applied first, Lab 3 data is inserted, then the Lab 4 migration is
// applied and checked, the seed is run twice, and the documented rollback SQL is executed and
// followed by a re-deploy (recovery). The test database is dropped afterwards; the development
// database is never modified.
const TEST_DB = 'toktickit_lab4_migration_test';
const SERVER_DIR = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(SERVER_DIR, 'prisma/migrations');
const LAB4_MIGRATION = '20260927120000_lab4_actions_status_history';
const ROLLBACK_SQL = path.join(SERVER_DIR, 'prisma/rollback', `${LAB4_MIGRATION}.down.sql`);
const EARLIER_MIGRATIONS = fs.readdirSync(MIGRATIONS_DIR).filter((name) => /^\d{14}_/.test(name) && name < LAB4_MIGRATION);

type TicketRow = { id: number; ticketNumber: string; ownerId: number | null; currentStatus: string; updatedAt: Date };

describe('Lab 4 Migration, Backfill, Seed and Rollback (MIG-01..05)', () => {
  const admin = getPrisma();
  let testUrl: string;
  let tmpDir: string;
  let db: PrismaClient;
  let ticketsBefore: TicketRow[];
  let lab3CountsBefore: Record<string, number>;

  const deploy = () => execSync(`npx prisma migrate deploy --schema "${path.join(tmpDir, 'schema.prisma')}"`, {
    cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'pipe',
  }).toString();
  const seed = () => execSync('npx tsx prisma/seed.ts', { cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: testUrl }, stdio: 'pipe' });
  const copyMigration = (name: string) => fs.cpSync(path.join(MIGRATIONS_DIR, name), path.join(tmpDir, 'migrations', name), { recursive: true });
  const count = async (table: string) => Number((await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM "${table}"`))[0].n);
  const lab3Counts = async () => ({
    users: await count('User'), tickets: await count('Ticket'), attachments: await count('Attachment'),
    publicComments: await count('PublicComment'), internalNotes: await count('InternalNote'),
    categories: await count('Category'), systems: await count('RelatedSystem'),
  });
  const tableExists = async (table: string) =>
    Number((await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_name = '${table}'`))[0].n) === 1;

  beforeAll(async () => {
    await admin.$connect(); // loads DATABASE_URL from server/.env into process.env
    const base = process.env.DATABASE_URL;
    if (!base) throw new Error('DATABASE_URL is not set');
    const url = new URL(base);
    url.pathname = `/${TEST_DB}`;
    testUrl = url.toString();

    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB}"`);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toktickit-lab4-migration-'));
    fs.copyFileSync(path.join(SERVER_DIR, 'prisma/schema.prisma'), path.join(tmpDir, 'schema.prisma'));
    fs.mkdirSync(path.join(tmpDir, 'migrations'));
    fs.copyFileSync(path.join(MIGRATIONS_DIR, 'migration_lock.toml'), path.join(tmpDir, 'migrations/migration_lock.toml'));
    EARLIER_MIGRATIONS.forEach(copyMigration);
    deploy();

    db = new PrismaClient({ datasources: { db: { url: testUrl } } });
    // Lab 3 data: owned and unassigned Tickets in several statuses, comments, notes and attachments.
    const sql = [
      `INSERT INTO "Category" ("id","name") VALUES (901,'Mig Hardware')`,
      `INSERT INTO "RelatedSystem" ("id","name") VALUES (901,'Mig Printer')`,
      `INSERT INTO "User" ("id","name","email","passwordHash","role","isActive","mustChangePassword","updatedAt") VALUES
         (801,'Mig Requester','mig.requester@example.com','x','REQUESTER',true,false,NOW()),
         (802,'Mig Staff','mig.staff@example.com','x','IT_STAFF',true,false,NOW()),
         (803,'Mig Admin','mig.admin@example.com','x','ADMINISTRATOR',true,false,NOW())`,
      `INSERT INTO "Ticket" ("id","ticketNumber","requesterId","ownerId","categoryId","relatedSystemId","requestedPriority","itPriority","currentStatus","summary","description","resolutionSummary","updatedAt") VALUES
         (601,'MIG-000601',801,NULL,901,901,'LOW','LOW','NEW','New one','Lab 3 ticket',NULL,'2026-09-01T08:00:00Z'),
         (602,'MIG-000602',801,802,901,901,'HIGH','CRITICAL','IN_PROGRESS','In progress one','Lab 3 ticket',NULL,'2026-09-02T08:00:00Z'),
         (603,'MIG-000603',801,802,901,901,'MEDIUM','MEDIUM','RESOLVED','Resolved one','Lab 3 ticket','Fixed','2026-09-03T08:00:00Z'),
         (604,'MIG-000604',801,802,901,901,'MEDIUM','LOW','CLOSED','Closed one','Lab 3 ticket','Fixed','2026-09-04T08:00:00Z')`,
      `INSERT INTO "PublicComment" ("id","ticketId","authorId","content") VALUES (901,602,801,'Any update?'),(902,602,802,'Working on it.')`,
      `INSERT INTO "InternalNote" ("id","ticketId","authorId","content") VALUES (901,602,802,'Checked the logs.')`,
      `INSERT INTO "Attachment" ("id","ticketId","originalFilename","storedFilename","fileType","fileSize") VALUES (901,603,'a.pdf','file-901.pdf','application/pdf',100)`,
    ];
    for (const s of sql) await db.$executeRawUnsafe(s);

    ticketsBefore = await db.$queryRawUnsafe<TicketRow[]>(
      `SELECT "id","ticketNumber","ownerId","currentStatus"::text AS "currentStatus","updatedAt" FROM "Ticket" ORDER BY "id"`);
    lab3CountsBefore = await lab3Counts();

    copyMigration(LAB4_MIGRATION);
    deploy();
  }, 180_000);

  afterAll(async () => {
    await db?.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}" WITH (FORCE)`);
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('MIG-01: the Lab 4 migration keeps every Lab 3 row and starts each Ticket at version 1', async () => {
    expect(await lab3Counts()).toEqual(lab3CountsBefore);
    const after = await db.ticket.findMany({ orderBy: { id: 'asc' } });
    expect(after.map((t) => [t.id, t.ticketNumber, t.ownerId, t.currentStatus, t.updatedAt.toISOString()]))
      .toEqual(ticketsBefore.map((t) => [t.id, t.ticketNumber, t.ownerId, t.currentStatus, new Date(t.updatedAt).toISOString()]));
    after.forEach((t) => expect(t.version).toBe(1));
    expect(await db.publicComment.count({ where: { ticketId: 602 } })).toBe(2);
    expect(await db.internalNote.count({ where: { ticketId: 602 } })).toBe(1);
    expect((await db.attachment.findUniqueOrThrow({ where: { id: 901 } })).ticketId).toBe(603);
  });

  it('MIG-02: every legacy Ticket gets exactly one backfilled status-history entry', async () => {
    for (const t of ticketsBefore) {
      const history = await db.ticketStatusHistory.findMany({ where: { ticketId: t.id } });
      expect(history).toHaveLength(1);
      expect(history[0].fromStatus).toBeNull();
      expect(history[0].toStatus).toBe(t.currentStatus);
      expect(history[0].changedById).toBe(t.ownerId);
      expect(history[0].reason).toBe('Backfilled from migration');
      expect(history[0].createdAt.toISOString()).toBe(new Date(t.updatedAt).toISOString());
    }
  });

  it('MIG-03: legacy Tickets start with zero Actions Taken', async () => {
    expect(await db.actionTaken.count()).toBe(0);
  });

  it('MIG-04: the seed is repeat-safe and covers zero/one/many Actions and zero/non-zero metrics', async () => {
    seed();
    const afterFirst = { ...(await lab3Counts()), actions: await count('ActionTaken'), history: await count('TicketStatusHistory') };
    seed();
    const afterSecond = { ...(await lab3Counts()), actions: await count('ActionTaken'), history: await count('TicketStatusHistory') };
    expect(afterSecond).toEqual(afterFirst);

    // Legacy rows survive seeding, and every Ticket has a status history.
    expect(await db.ticket.count({ where: { ticketNumber: { startsWith: 'MIG-' } } })).toBe(ticketsBefore.length);
    expect(await db.ticket.count({ where: { statusHistory: { none: {} } } })).toBe(0);

    // Zero, one and many Actions Taken; all four action statuses.
    const fixtures = await db.ticket.findMany({
      where: { ticketNumber: { startsWith: 'TKT-2026-L4-' } },
      include: { actionsTaken: true },
    });
    expect(fixtures).toHaveLength(8);
    const actionCounts = fixtures.map((t) => t.actionsTaken.length);
    expect(actionCounts).toContain(0);
    expect(actionCounts).toContain(1);
    expect(Math.max(...actionCounts)).toBeGreaterThanOrEqual(3);
    const many = fixtures.find((t) => t.actionsTaken.length >= 3)!;
    expect(new Set(many.actionsTaken.map((a) => a.performedById)).size).toBeGreaterThan(1);
    const statuses = new Set(fixtures.flatMap((t) => t.actionsTaken.map((a) => a.status)));
    expect([...statuses].sort()).toEqual(['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'PLANNED']);

    // Zero and non-zero dashboard inputs.
    const user = (email: string) => db.user.findUniqueOrThrow({ where: { email } });
    const openGroup = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;
    const openStatuses = { in: ['PLANNED', 'IN_PROGRESS'] as ('PLANNED' | 'IN_PROGRESS')[] };
    const sarah = await user('requester3@toktickit.com');
    const david = await user('requester4@toktickit.com');
    const staff1 = await user('staff1@toktickit.com');
    const staff3 = await user('staff3@toktickit.com');

    expect(await db.ticket.count({ where: { requesterId: david.id } })).toBe(0);
    for (const status of ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED'] as const) {
      expect(await db.ticket.count({ where: { requesterId: sarah.id, currentStatus: status } })).toBeGreaterThan(0);
    }
    expect(await db.ticket.count({ where: { requesterId: sarah.id, currentStatus: { in: [...openGroup] } } })).toBeGreaterThan(0);

    expect(await db.actionTaken.count({ where: { assignedToId: staff1.id, status: openStatuses } })).toBeGreaterThan(0);
    expect(await db.actionTaken.count({ where: { assignedToId: staff3.id, status: openStatuses } })).toBe(0);
    expect(await db.ticket.count({ where: { ownerId: staff3.id, currentStatus: { in: [...openGroup] } } })).toBe(0);
    expect(await db.actionTaken.count({ where: { followUpRequired: true, status: openStatuses } })).toBeGreaterThan(0);
    expect(await db.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } })).toBeGreaterThan(0);
    expect(await db.user.count({ where: { role: 'ADMINISTRATOR', isActive: false } })).toBe(0);
  }, 240_000);

  it('MIG-05: the rollback SQL removes only Lab 4 objects, and re-deploying recovers the schema', async () => {
    const countsBeforeRollback = await lab3Counts();
    const statements = fs.readFileSync(ROLLBACK_SQL, 'utf-8')
      .split('\n').filter((line) => !line.trim().startsWith('--')).join('\n')
      .split(';').map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) await db.$executeRawUnsafe(statement);

    expect(await tableExists('ActionTaken')).toBe(false);
    expect(await tableExists('TicketStatusHistory')).toBe(false);
    const versionColumn = await db.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_name = 'Ticket' AND column_name = 'version'`);
    expect(Number(versionColumn[0].n)).toBe(0);
    const enumType = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM pg_type WHERE typname = 'ActionStatus'`);
    expect(Number(enumType[0].n)).toBe(0);
    expect(await lab3Counts()).toEqual(countsBeforeRollback);

    // Recovery: the same migration applies again and backfills one entry per Ticket.
    expect(deploy()).toMatch(new RegExp(LAB4_MIGRATION));
    expect(await count('TicketStatusHistory')).toBe(countsBeforeRollback.tickets);
    expect(await count('ActionTaken')).toBe(0);
    expect(await lab3Counts()).toEqual(countsBeforeRollback);
  }, 180_000);
});

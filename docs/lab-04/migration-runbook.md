# Lab 4 Migration Runbook: Deploy, Backfill, Rollback and Recovery

Migration: `server/prisma/migrations/20260927120000_lab4_actions_status_history`
Rollback SQL: `server/prisma/rollback/20260927120000_lab4_actions_status_history.down.sql`
Automated proof: `server/tests/lab-04/migration.api.test.ts` (MIG-01 to MIG-05, disposable database)

## 1. What the migration changes

The migration is additive (BR-33). It:
- creates the `ActionStatus` enum and the `ActionTaken` and `TicketStatusHistory` tables;
- adds `Ticket.version` (`INTEGER NOT NULL DEFAULT 1`);
- adds the indexes `ActionTaken(ticketId, actionAt)`, `ActionTaken(assignedToId, status)`, unique `ActionTaken(ticketId, idempotencyKey)`, `TicketStatusHistory(ticketId, createdAt, id)`, `Ticket(ownerId, currentStatus)` and `Ticket(currentStatus, itPriority)`;
- backfills one `TicketStatusHistory` row per existing Ticket (BR-34): `fromStatus = NULL`, `toStatus = currentStatus`, `changedById = ownerId`, `reason = 'Backfilled from migration'`, `createdAt = Ticket.updatedAt`.

No existing table, column or row is changed or removed. Existing Tickets start with zero Actions Taken.

## 2. Deploy

Run from the repository root in Git Bash with the API server stopped.

```bash
# 1. Backup (inside the container, then copy out; keep backups outside the repository)
mkdir -p ../toktickit-backups
docker exec toktickit-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/pre-lab4.dump'
docker cp toktickit-postgres:/tmp/pre-lab4.dump ../toktickit-backups/pre-lab4.dump

# 2. Apply the migration and regenerate the Prisma client
cd server
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
cd ..

# 3. Verify: every Ticket has at least one status-history row (expect 0)
docker exec toktickit-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM \"Ticket\" t WHERE NOT EXISTS (SELECT 1 FROM \"TicketStatusHistory\" h WHERE h.\"ticketId\" = t.id)"'
```

The pg_dump file is created inside the container and copied out with `docker cp` because redirecting binary output through PowerShell corrupts the dump.

## 3. Rollback

Use rollback only if the Lab 4 release must be withdrawn. Stop the API server first.

### Option A: rollback SQL (keeps all Lab 1-3 data written after the deploy)

```bash
docker cp server/prisma/rollback/20260927120000_lab4_actions_status_history.down.sql toktickit-postgres:/tmp/lab4-down.sql
docker exec toktickit-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -1 -f /tmp/lab4-down.sql'
```

The script runs in one transaction (`-1`). It drops `ActionTaken`, `TicketStatusHistory`, the `ActionStatus` enum, the two new Ticket indexes and `Ticket.version`, and removes the migration row from `_prisma_migrations`. Actions Taken and status history recorded after the deploy are lost; every User, Ticket, Attachment, Public Comment and Internal Note stays. Then check out the Lab 3 code (schema without Lab 4 models) and run `npx prisma generate` in `server/`.

### Option B: restore the pre-deploy backup (returns the whole database to the backup point)

```bash
docker exec toktickit-postgres sh -c 'dropdb -U "$POSTGRES_USER" --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker cp ../toktickit-backups/pre-lab4.dump toktickit-postgres:/tmp/restore.dump
docker exec toktickit-postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner /tmp/restore.dump'
```

Everything written after the backup is lost, so Option A is preferred unless the Lab 1-3 data itself is damaged.

## 4. Recovery (re-apply after a rollback)

```bash
cd server
npx prisma migrate deploy   # applies the Lab 4 migration again and re-runs the backfill
npx prisma generate
npm run prisma:seed          # repeat-safe; restores the Lab 4 fixtures
```

## 5. How this is tested

`server/tests/lab-04/migration.api.test.ts` creates the disposable database `toktickit_lab4_migration_test`, applies the Lab 1-3 migrations, inserts Lab 3 data, and then checks:

| Test | Check |
|---|---|
| MIG-01 | Lab 3 row counts and Ticket fields unchanged; every Ticket has `version = 1` |
| MIG-02 | Exactly one backfilled history row per legacy Ticket with the values in Section 1 |
| MIG-03 | Legacy Tickets have zero Actions Taken |
| MIG-04 | Seed run twice gives identical counts; zero, one and many Actions; all four action statuses; zero and non-zero dashboard inputs |
| MIG-05 | Rollback SQL (Option A) removes only Lab 4 objects and keeps Lab 1-3 counts; re-deploy recovers the schema and the backfill |

Option B (backup and restore) was run manually on a copy of the development database before release; the row counts matched the backup.

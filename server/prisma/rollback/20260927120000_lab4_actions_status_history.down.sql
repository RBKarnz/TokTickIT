-- Rollback for migration 20260927120000_lab4_actions_status_history.
-- Take a pg_dump backup first (docs/lab-04/migration-runbook.md).
-- Removes only Lab 4 objects; every Lab 1-3 table and row is left untouched.
DROP TABLE IF EXISTS "ActionTaken";
DROP TABLE IF EXISTS "TicketStatusHistory";
DROP TYPE IF EXISTS "ActionStatus";
DROP INDEX IF EXISTS "Ticket_ownerId_currentStatus_idx";
DROP INDEX IF EXISTS "Ticket_currentStatus_itPriority_idx";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "version";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260927120000_lab4_actions_status_history';

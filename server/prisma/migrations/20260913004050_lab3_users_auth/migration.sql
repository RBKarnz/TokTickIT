-- Lab 3: Users, Authentication, Comments, Notes, and Ticket extensions
-- This migration:
--   1. Extends TicketStatus enum with new values
--   2. Creates Role enum
--   3. Creates User table and migrates RequesterUser data
--   4. Creates Session, PublicComment, InternalNote tables
--   5. Adds new Ticket fields (ownerId, requesterResolvedAt, resolutionSummary)
--   6. Remaps Ticket.requesterId from RequesterUser to User
--   7. Drops RequesterUser table

-- =========================================================================
-- Step 1: Extend TicketStatus enum with Lab 3 values
-- =========================================================================
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- =========================================================================
-- Step 2: Create Role enum
-- =========================================================================
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- =========================================================================
-- Step 3: Create User table
-- =========================================================================
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- =========================================================================
-- Step 4: Migrate RequesterUser data into User
-- Each RequesterUser becomes a User with role=REQUESTER,
-- hashed initial password (Argon2id of Password123!), mustChangePassword=true
-- =========================================================================
INSERT INTO "User" ("name", "email", "passwordHash", "role", "isActive", "mustChangePassword", "createdAt", "updatedAt")
SELECT
    "name",
    LOWER(TRIM("email")),
    '$argon2id$v=19$m=65536,p=4,t=3$pDyPuImK0zY9DD+HAy4Mkg$Af4ZSe66nS5lZJ2jrP0Nzsc8sNJmav5ItQNs77Heha8',
    'REQUESTER'::"Role",
    "isActive",
    true,
    "createdAt",
    "createdAt"
FROM "RequesterUser";

-- =========================================================================
-- Step 5: Add new columns to Ticket BEFORE remapping FK
-- =========================================================================
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "requesterResolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "resolutionSummary" TEXT;

-- =========================================================================
-- Step 6: Remap Ticket.requesterId from RequesterUser to User
-- =========================================================================

-- Drop the old FK constraint
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";

-- Update requesterId to point to the new User.id (matched by email)
UPDATE "Ticket" t
SET "requesterId" = u."id"
FROM "RequesterUser" r, "User" u
WHERE t."requesterId" = r."id"
  AND LOWER(TRIM(r."email")) = u."email";

-- Add the new FK constraint
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add FK for ownerId
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for ownerId
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- Add index for updatedAt (used by queue sorting)
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");

-- =========================================================================
-- Step 7: Drop RequesterUser table (data has been migrated)
-- =========================================================================
DROP TABLE "RequesterUser";

-- =========================================================================
-- Step 8: Create Session table
-- =========================================================================
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- Step 9: Create PublicComment table
-- =========================================================================
CREATE TABLE "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicComment_ticketId_idx" ON "PublicComment"("ticketId");

-- CreateIndex
CREATE INDEX "PublicComment_createdAt_idx" ON "PublicComment"("createdAt");

-- AddForeignKey
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- Step 10: Create InternalNote table
-- =========================================================================
CREATE TABLE "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalNote_ticketId_idx" ON "InternalNote"("ticketId");

-- CreateIndex
CREATE INDEX "InternalNote_createdAt_idx" ON "InternalNote"("createdAt");

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

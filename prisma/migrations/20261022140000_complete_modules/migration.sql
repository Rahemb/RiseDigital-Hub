-- Additive migration. Existing rows, identities, credentials and relationships remain intact.
ALTER TABLE "Organization" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "website" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "organizationNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Organization" ADD COLUMN "currencyDisplay" TEXT NOT NULL DEFAULT 'symbol';
ALTER TABLE "Organization" ADD COLUMN "weekStartsOn" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Organization" ADD COLUMN "focusDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "ClientService" ADD COLUMN "intervalDays" INTEGER;
ALTER TABLE "Project" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "ActivityLog" ADD COLUMN "entityType" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "entityId" TEXT;
CREATE TABLE "TicketComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TicketComment_ticketId_createdAt_idx" ON "TicketComment"("ticketId","createdAt");

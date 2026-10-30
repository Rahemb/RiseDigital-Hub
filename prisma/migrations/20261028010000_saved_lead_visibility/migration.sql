-- CreateTable
CREATE TABLE "SavedLeadState" (
    "leadId" TEXT NOT NULL PRIMARY KEY,
    "removedAt" DATETIME,
    CONSTRAINT "SavedLeadState_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

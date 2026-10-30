-- CreateTable
CREATE TABLE "WebsiteDiscovery" (
    "leadId" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "candidates" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "selectedUrl" TEXT NOT NULL DEFAULT '',
    "startingWebsite" TEXT NOT NULL DEFAULT '',
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "WebsiteDiscovery_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoveryBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "analyze" BOOLEAN NOT NULL DEFAULT false,
    "leaseUntil" DATETIME,
    "leaseToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveryBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoveryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUEUED',
    "outcome" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "completedAt" DATETIME,
    CONSTRAINT "DiscoveryItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DiscoveryBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscoveryItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WebsiteDiscovery_status_checkedAt_idx" ON "WebsiteDiscovery"("status", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryBatch_organizationId_key" ON "DiscoveryBatch"("organizationId");

-- CreateIndex
CREATE INDEX "DiscoveryItem_batchId_state_idx" ON "DiscoveryItem"("batchId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryItem_batchId_leadId_key" ON "DiscoveryItem"("batchId", "leadId");

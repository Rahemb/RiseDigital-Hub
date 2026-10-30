-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "orgNumber" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT '',
    "industryCode" TEXT NOT NULL DEFAULT '',
    "municipality" TEXT NOT NULL DEFAULT '',
    "municipalityCode" TEXT NOT NULL DEFAULT '',
    "registryVerified" BOOLEAN NOT NULL DEFAULT false,
    "registryActive" BOOLEAN,
    "website" TEXT NOT NULL DEFAULT '',
    "websiteSource" TEXT NOT NULL DEFAULT '',
    "websiteStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "websiteVerifiedAt" DATETIME,
    "email" TEXT NOT NULL DEFAULT '',
    "emailSource" TEXT NOT NULL DEFAULT '',
    "emailStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "emailKind" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "qualification" TEXT NOT NULL DEFAULT 'NEW',
    "contactStatus" TEXT NOT NULL DEFAULT 'NOT_CONTACTED',
    "notes" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "score" INTEGER,
    "scoreAssessment" TEXT NOT NULL DEFAULT 'INSUFFICIENT',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewedAt" DATETIME,
    "followUpAt" DATETIME,
    "approvedAt" DATETIME,
    "complianceNotes" TEXT NOT NULL DEFAULT '',
    "clientId" TEXT,
    "scanUntil" DATETIME,
    CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsiteAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "findings" TEXT NOT NULL,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteAudit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "value" INTEGER,
    "assessment" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutreachDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutreachActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Suppression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Suppression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeadSettings" (
    "organizationId" TEXT NOT NULL PRIMARY KEY,
    "config" TEXT NOT NULL,
    "requestAfter" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeadSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Lead_organizationId_contactStatus_followUpAt_idx" ON "Lead"("organizationId", "contactStatus", "followUpAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_qualification_score_idx" ON "Lead"("organizationId", "qualification", "score");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_orgNumber_key" ON "Lead"("organizationId", "orgNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_organizationId_kind_key" ON "LeadSource"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "WebsiteAudit_leadId_createdAt_idx" ON "WebsiteAudit"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadScore_leadId_createdAt_idx" ON "LeadScore"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "OutreachDraft_leadId_updatedAt_idx" ON "OutreachDraft"("leadId", "updatedAt");

-- CreateIndex
CREATE INDEX "OutreachActivity_leadId_createdAt_idx" ON "OutreachActivity"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Suppression_organizationId_key_key" ON "Suppression"("organizationId", "key");

-- CreateTable
CREATE TABLE "LeadReview" (
    "leadId" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL DEFAULT '',
    "websiteQuality" TEXT NOT NULL DEFAULT '',
    "googleObservations" TEXT NOT NULL DEFAULT '',
    "opportunities" TEXT NOT NULL DEFAULT '',
    "relevantServices" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "LeadReview_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

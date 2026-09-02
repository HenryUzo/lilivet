CREATE TABLE "ClientImportRun" (
  "id" TEXT NOT NULL,
  "initiatedByStaffUserId" TEXT,
  "originalFileName" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL DEFAULT 'New Client Tracker',
  "totalRows" INTEGER NOT NULL,
  "importedCount" INTEGER NOT NULL,
  "updatedCount" INTEGER NOT NULL,
  "skippedCount" INTEGER NOT NULL,
  "skippedRows" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientImportRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientImportRun_createdAt_idx" ON "ClientImportRun"("createdAt");
CREATE INDEX "ClientImportRun_initiatedByStaffUserId_createdAt_idx" ON "ClientImportRun"("initiatedByStaffUserId", "createdAt");
ALTER TABLE "ClientImportRun" ADD CONSTRAINT "ClientImportRun_initiatedByStaffUserId_fkey" FOREIGN KEY ("initiatedByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

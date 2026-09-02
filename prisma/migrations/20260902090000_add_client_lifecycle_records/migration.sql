CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED');

CREATE TABLE "ClientLifecycleRecord" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "newClientDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leadSource" TEXT,
  "referredBy" TEXT,
  "regularVeterinarian" TEXT,
  "firstVisitType" TEXT,
  "doctorSeen" TEXT,
  "recheckRecommended" BOOLEAN NOT NULL DEFAULT false,
  "recheckScheduled" BOOLEAN NOT NULL DEFAULT false,
  "recheckDate" TIMESTAMP(3),
  "recheckCompleted" BOOLEAN NOT NULL DEFAULT false,
  "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
  "firstVisitRevenue" DECIMAL(10,2),
  "additionalServicesRevenue" DECIMAL(10,2),
  "wellnessPlan" TEXT,
  "clientStatus" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastVisitAt" TIMESTAMP(3),
  "nextAppointmentAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientLifecycleRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientLifecycleRecord_ownerId_petId_key" ON "ClientLifecycleRecord"("ownerId", "petId");
CREATE INDEX "ClientLifecycleRecord_leadSource_idx" ON "ClientLifecycleRecord"("leadSource");
CREATE INDEX "ClientLifecycleRecord_clientStatus_idx" ON "ClientLifecycleRecord"("clientStatus");
CREATE INDEX "ClientLifecycleRecord_recheckScheduled_recheckCompleted_idx" ON "ClientLifecycleRecord"("recheckScheduled", "recheckCompleted");
CREATE INDEX "ClientLifecycleRecord_newClientDate_idx" ON "ClientLifecycleRecord"("newClientDate");
ALTER TABLE "ClientLifecycleRecord" ADD CONSTRAINT "ClientLifecycleRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientLifecycleRecord" ADD CONSTRAINT "ClientLifecycleRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

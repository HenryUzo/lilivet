CREATE TYPE "StaffPermissionKey" AS ENUM (
  'APPOINTMENTS_VIEW', 'APPOINTMENTS_MANAGE', 'NEW_PATIENTS_VIEW', 'PET_CARE_VIEW',
  'PET_CARE_EDIT', 'PET_CARE_PUBLISH', 'PET_CARE_REVIEWERS'
);

ALTER TABLE "StaffUser"
  ADD COLUMN "invitationTokenHash" TEXT,
  ADD COLUMN "invitationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "invitationAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "invitedByStaffUserId" TEXT;
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_invitedByStaffUserId_fkey"
  FOREIGN KEY ("invitedByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "StaffUser_invitationTokenHash_key" ON "StaffUser"("invitationTokenHash");
CREATE INDEX "StaffUser_invitationExpiresAt_idx" ON "StaffUser"("invitationExpiresAt");

CREATE TABLE "StaffPermission" (
  "id" TEXT NOT NULL, "staffUserId" TEXT NOT NULL, "key" "StaffPermissionKey" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffPermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffPermission_staffUserId_key_key" ON "StaffPermission"("staffUserId", "key");
CREATE INDEX "StaffPermission_key_idx" ON "StaffPermission"("key");
ALTER TABLE "StaffPermission" ADD CONSTRAINT "StaffPermission_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StaffAccessAuditLog" (
  "id" TEXT NOT NULL, "actorId" TEXT, "targetUserId" TEXT, "action" TEXT NOT NULL,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAccessAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffAccessAuditLog_targetUserId_createdAt_idx" ON "StaffAccessAuditLog"("targetUserId", "createdAt");
CREATE INDEX "StaffAccessAuditLog_actorId_createdAt_idx" ON "StaffAccessAuditLog"("actorId", "createdAt");
ALTER TABLE "StaffAccessAuditLog" ADD CONSTRAINT "StaffAccessAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffAccessAuditLog" ADD CONSTRAINT "StaffAccessAuditLog_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing full administrators become Super Admins. Existing staff retain their current intake access.
UPDATE "StaffUser" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';
INSERT INTO "StaffPermission" ("id", "staffUserId", "key")
SELECT concat('migration_', "id", '_appointments_view'), "id", 'APPOINTMENTS_VIEW'::"StaffPermissionKey" FROM "StaffUser" WHERE "role" = 'STAFF'
UNION ALL
SELECT concat('migration_', "id", '_appointments_manage'), "id", 'APPOINTMENTS_MANAGE'::"StaffPermissionKey" FROM "StaffUser" WHERE "role" = 'STAFF'
UNION ALL
SELECT concat('migration_', "id", '_new_patients_view'), "id", 'NEW_PATIENTS_VIEW'::"StaffPermissionKey" FROM "StaffUser" WHERE "role" = 'STAFF';

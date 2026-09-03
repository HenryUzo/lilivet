ALTER TABLE "StaffUser"
  ADD COLUMN "mfaSecretEncrypted" TEXT,
  ADD COLUMN "mfaPendingSecretEncrypted" TEXT,
  ADD COLUMN "mfaEnabledAt" TIMESTAMP(3);

CREATE TABLE "StaffMfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "staffUserId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffMfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffMfaRecoveryCode_staffUserId_usedAt_idx"
  ON "StaffMfaRecoveryCode"("staffUserId", "usedAt");

ALTER TABLE "StaffMfaRecoveryCode"
  ADD CONSTRAINT "StaffMfaRecoveryCode_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'STAFF');

CREATE TABLE "StaffUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");
CREATE INDEX "StaffUser_email_idx" ON "StaffUser"("email");
CREATE INDEX "StaffUser_isActive_idx" ON "StaffUser"("isActive");

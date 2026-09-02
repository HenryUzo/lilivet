ALTER TABLE "Owner" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "Owner" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "Owner" ADD COLUMN "city" TEXT;
ALTER TABLE "Owner" ADD COLUMN "state" TEXT;
ALTER TABLE "Owner" ADD COLUMN "postalCode" TEXT;

CREATE TYPE "OwnerContactChannel" AS ENUM ('PHONE', 'EMAIL');
CREATE TYPE "ClientDataSource" AS ENUM ('WEAVE', 'LILI_WEB', 'MANUAL');

CREATE TABLE "OwnerContactMethod" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "channel" "OwnerContactChannel" NOT NULL,
  "label" TEXT,
  "value" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "source" "ClientDataSource",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OwnerContactMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OwnerContactMethod_ownerId_channel_value_key" ON "OwnerContactMethod"("ownerId", "channel", "value");
CREATE INDEX "OwnerContactMethod_ownerId_channel_idx" ON "OwnerContactMethod"("ownerId", "channel");
ALTER TABLE "OwnerContactMethod" ADD CONSTRAINT "OwnerContactMethod_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExternalClientRecord" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "source" "ClientDataSource" NOT NULL,
  "externalContactId" TEXT,
  "externalPetId" TEXT,
  "contactStatus" TEXT,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalClientRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExternalClientRecord_source_externalContactId_externalPetId_key" ON "ExternalClientRecord"("source", "externalContactId", "externalPetId");
CREATE INDEX "ExternalClientRecord_ownerId_idx" ON "ExternalClientRecord"("ownerId");
CREATE INDEX "ExternalClientRecord_petId_idx" ON "ExternalClientRecord"("petId");
ALTER TABLE "ExternalClientRecord" ADD CONSTRAINT "ExternalClientRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalClientRecord" ADD CONSTRAINT "ExternalClientRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

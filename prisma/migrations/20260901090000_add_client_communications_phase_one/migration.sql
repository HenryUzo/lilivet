CREATE TYPE "MarketingConsentStatus" AS ENUM ('NOT_SUBSCRIBED', 'SUBSCRIBED', 'UNSUBSCRIBED', 'SUPPRESSED');
CREATE TYPE "MarketingChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "MarketingConsentAction" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'SUPPRESSED');

ALTER TYPE "StaffPermissionKey" ADD VALUE IF NOT EXISTS 'CLIENTS_VIEW';
ALTER TYPE "StaffPermissionKey" ADD VALUE IF NOT EXISTS 'CLIENTS_MANAGE';

ALTER TABLE "AppointmentDraft" ADD COLUMN "marketingEmailOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppointmentDraft" ADD COLUMN "marketingSmsOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "NewPatientRequest" ADD COLUMN "marketingEmailOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "NewPatientRequest" ADD COLUMN "marketingSmsOptIn" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ClientProfile" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "emailMarketingStatus" "MarketingConsentStatus" NOT NULL DEFAULT 'NOT_SUBSCRIBED',
  "smsMarketingStatus" "MarketingConsentStatus" NOT NULL DEFAULT 'NOT_SUBSCRIBED',
  "emailConsentAt" TIMESTAMP(3),
  "smsConsentAt" TIMESTAMP(3),
  "emailConsentSource" TEXT,
  "smsConsentSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientCommunicationConsent" (
  "id" TEXT NOT NULL,
  "clientProfileId" TEXT NOT NULL,
  "channel" "MarketingChannel" NOT NULL,
  "action" "MarketingConsentAction" NOT NULL,
  "source" TEXT NOT NULL,
  "policyVersion" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientCommunicationConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientProfile_ownerId_key" ON "ClientProfile"("ownerId");
CREATE INDEX "ClientProfile_emailMarketingStatus_idx" ON "ClientProfile"("emailMarketingStatus");
CREATE INDEX "ClientProfile_smsMarketingStatus_idx" ON "ClientProfile"("smsMarketingStatus");
CREATE INDEX "ClientCommunicationConsent_clientProfileId_channel_recordedAt_idx" ON "ClientCommunicationConsent"("clientProfileId", "channel", "recordedAt");
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCommunicationConsent" ADD CONSTRAINT "ClientCommunicationConsent_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

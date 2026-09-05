ALTER TYPE "StaffPermissionKey" ADD VALUE IF NOT EXISTS 'CAMPAIGNS_VIEW';
ALTER TYPE "StaffPermissionKey" ADD VALUE IF NOT EXISTS 'CAMPAIGNS_MANAGE';

CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENDING', 'SENT', 'FAILED');
CREATE TYPE "MarketingDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED');
CREATE TYPE "MarketingAudienceMode" AS ENUM ('CONSENTED_CLIENTS', 'SELECTED_EMAILS');

CREATE TABLE "MarketingCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "senderAddress" TEXT NOT NULL,
  "audienceMode" "MarketingAudienceMode" NOT NULL DEFAULT 'CONSENTED_CLIENTS',
  "customAudience" JSONB,
  "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "audienceCount" INTEGER NOT NULL DEFAULT 0,
  "brevoCampaignId" INTEGER,
  "brevoListId" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "createdById" TEXT NOT NULL,
  "sentById" TEXT,
  "sentAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingCampaignDelivery" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "clientProfileId" TEXT,
  "recipientHash" TEXT NOT NULL,
  "status" "MarketingDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "providerMessageId" TEXT,
  "eventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingCampaignDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingEmailSuppression" (
  "id" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingEmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingCampaign_brevoCampaignId_key" ON "MarketingCampaign"("brevoCampaignId");
CREATE INDEX "MarketingCampaign_status_createdAt_idx" ON "MarketingCampaign"("status", "createdAt");
CREATE INDEX "MarketingCampaign_createdById_createdAt_idx" ON "MarketingCampaign"("createdById", "createdAt");
CREATE UNIQUE INDEX "MarketingCampaignDelivery_campaignId_clientProfileId_key" ON "MarketingCampaignDelivery"("campaignId", "clientProfileId");
CREATE INDEX "MarketingCampaignDelivery_clientProfileId_status_idx" ON "MarketingCampaignDelivery"("clientProfileId", "status");
CREATE INDEX "MarketingCampaignDelivery_providerMessageId_idx" ON "MarketingCampaignDelivery"("providerMessageId");
CREATE UNIQUE INDEX "MarketingEmailSuppression_emailHash_key" ON "MarketingEmailSuppression"("emailHash");
CREATE INDEX "MarketingEmailSuppression_suppressedAt_idx" ON "MarketingEmailSuppression"("suppressedAt");
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaignDelivery" ADD CONSTRAINT "MarketingCampaignDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaignDelivery" ADD CONSTRAINT "MarketingCampaignDelivery_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

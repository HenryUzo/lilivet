ALTER TABLE "MarketingCampaign" ADD COLUMN "contentBlocks" JSONB;
ALTER TABLE "MarketingCampaign" ADD COLUMN "templateId" TEXT;

CREATE TABLE "MarketingEmailTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contentBlocks" JSONB NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingEmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingEmailTemplate_createdAt_idx" ON "MarketingEmailTemplate"("createdAt");
CREATE INDEX "MarketingEmailTemplate_createdById_createdAt_idx" ON "MarketingEmailTemplate"("createdById", "createdAt");

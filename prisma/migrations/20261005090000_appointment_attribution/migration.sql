ALTER TABLE "AppointmentDraft"
ADD COLUMN "gclid" TEXT,
ADD COLUMN "gbraid" TEXT,
ADD COLUMN "wbraid" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmTerm" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "landingPage" TEXT,
ADD COLUMN "referrer" TEXT,
ADD COLUMN "attributionCapturedAt" TIMESTAMP(3);

ALTER TABLE "AppointmentRequest"
ADD COLUMN "gclid" TEXT,
ADD COLUMN "gbraid" TEXT,
ADD COLUMN "wbraid" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmTerm" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "landingPage" TEXT,
ADD COLUMN "referrer" TEXT,
ADD COLUMN "attributionCapturedAt" TIMESTAMP(3),
ADD COLUMN "googleAdsBookedUploadedAt" TIMESTAMP(3),
ADD COLUMN "googleAdsAttendedUploadedAt" TIMESTAMP(3),
ADD COLUMN "googleAdsUploadError" TEXT;

CREATE INDEX "AppointmentRequest_gclid_idx" ON "AppointmentRequest"("gclid");

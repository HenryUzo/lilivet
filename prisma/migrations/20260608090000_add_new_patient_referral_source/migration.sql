CREATE TYPE "NewPatientReferralSource" AS ENUM (
  'PET_PARADISE',
  'WEBSITE',
  'GOOGLE',
  'PET_BARN',
  'WELCOME_HOME_MAGAZINE',
  'REFERRED_BY_ANOTHER_VETERINARIAN',
  'REFERRED_BY_FRIEND_OR_FAMILY_MEMBER',
  'OTHER'
);

ALTER TABLE "NewPatientRequest"
ADD COLUMN "referralSource" "NewPatientReferralSource",
ADD COLUMN "referralSourceOther" TEXT,
ADD COLUMN "referralSourceCapturedAt" TIMESTAMP(3),
ADD COLUMN "referralSourceCaptureTokenHash" TEXT,
ADD COLUMN "referralSourceCaptureTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "NewPatientRequest_referralSource_idx" ON "NewPatientRequest"("referralSource");

CREATE TYPE "OwnerDirectoryType" AS ENUM ('CLIENT', 'PROSPECT');
CREATE TYPE "PotentialClientSource" AS ENUM ('APPOINTMENT_DRAFT', 'NEW_PATIENT_FORM', 'WELLNESS_GIVEAWAY', 'PET_CARE_NEWSLETTER');

ALTER TABLE "Owner" ADD COLUMN "directoryType" "OwnerDirectoryType" NOT NULL DEFAULT 'CLIENT';

CREATE TABLE "PotentialClient" (
    "id" TEXT NOT NULL,
    "source" "PotentialClientSource" NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "phoneNumber" TEXT,
    "normalizedPhone" TEXT,
    "ownerId" TEXT,
    "emailMarketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "emailMarketingConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "emailConsentAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PotentialClient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PotentialClient_source_sourceRecordId_key" ON "PotentialClient"("source", "sourceRecordId");
CREATE INDEX "PotentialClient_normalizedEmail_idx" ON "PotentialClient"("normalizedEmail");
CREATE INDEX "PotentialClient_normalizedPhone_idx" ON "PotentialClient"("normalizedPhone");
CREATE INDEX "PotentialClient_emailMarketingOptIn_emailMarketingConfirmed_convertedAt_idx" ON "PotentialClient"("emailMarketingOptIn", "emailMarketingConfirmed", "convertedAt");
CREATE INDEX "PotentialClient_source_createdAt_idx" ON "PotentialClient"("source", "createdAt");
CREATE INDEX "PotentialClient_ownerId_idx" ON "PotentialClient"("ownerId");

ALTER TABLE "PotentialClient" ADD CONSTRAINT "PotentialClient_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PotentialClient" (
    "id", "source", "sourceRecordId", "sourceLabel", "firstName", "lastName", "email", "normalizedEmail",
    "phoneNumber", "normalizedPhone", "ownerId", "emailMarketingOptIn", "emailMarketingConfirmed", "emailConsentAt", "convertedAt", "createdAt", "updatedAt"
)
SELECT md5(random()::text || clock_timestamp()::text), 'NEW_PATIENT_FORM', request."id", 'Website new-patient request',
       split_part(trim(request."ownerFullName"), ' ', 1), NULLIF(regexp_replace(trim(request."ownerFullName"), '^[^ ]+[ ]*', ''), ''),
       COALESCE(request."ownerEmail", owner."email"), lower(COALESCE(request."ownerEmail", owner."email")),
       request."ownerPhoneNumber", owner."normalizedPhone", owner."id", request."marketingEmailOptIn", request."marketingEmailOptIn",
       CASE WHEN request."marketingEmailOptIn" THEN request."createdAt" ELSE NULL END,
       CASE WHEN EXISTS (SELECT 1 FROM "AppointmentRequest" appointment WHERE appointment."ownerId" = request."ownerId") THEN request."createdAt" ELSE NULL END,
       request."createdAt", now()
FROM "NewPatientRequest" request
LEFT JOIN "Owner" owner ON owner."id" = request."ownerId"
ON CONFLICT ("source", "sourceRecordId") DO NOTHING;

INSERT INTO "PotentialClient" (
    "id", "source", "sourceRecordId", "sourceLabel", "firstName", "lastName", "email", "normalizedEmail",
    "phoneNumber", "normalizedPhone", "ownerId", "emailMarketingOptIn", "emailMarketingConfirmed", "emailConsentAt", "convertedAt", "createdAt", "updatedAt"
)
SELECT md5(random()::text || clock_timestamp()::text), 'WELLNESS_GIVEAWAY', entry."id", 'Wellness giveaway',
       owner."firstName", owner."lastName", owner."email", lower(owner."email"), owner."phoneNumber", owner."normalizedPhone", owner."id",
       entry."marketingOptIn", entry."marketingConfirmed", CASE WHEN entry."marketingConfirmed" THEN entry."termsAcceptedAt" ELSE NULL END,
       CASE WHEN EXISTS (SELECT 1 FROM "AppointmentRequest" appointment WHERE appointment."ownerId" = entry."ownerId") THEN entry."createdAt" ELSE NULL END,
       entry."createdAt", now()
FROM "WellnessGiveawayEntry" entry
JOIN "Owner" owner ON owner."id" = entry."ownerId"
ON CONFLICT ("source", "sourceRecordId") DO NOTHING;

INSERT INTO "PotentialClient" (
    "id", "source", "sourceRecordId", "sourceLabel", "firstName", "lastName", "email", "normalizedEmail",
    "phoneNumber", "normalizedPhone", "emailMarketingOptIn", "emailMarketingConfirmed", "emailConsentAt", "createdAt", "updatedAt"
)
SELECT md5(random()::text || clock_timestamp()::text), 'APPOINTMENT_DRAFT', draft."id", 'Website appointment form (incomplete request)',
       draft."firstName", draft."lastName", draft."email", lower(draft."email"), draft."phoneNumber",
       CASE WHEN length(regexp_replace(COALESCE(draft."phoneNumber", ''), '[^0-9]', '', 'g')) = 10 THEN '1' || regexp_replace(draft."phoneNumber", '[^0-9]', '', 'g') ELSE regexp_replace(COALESCE(draft."phoneNumber", ''), '[^0-9]', '', 'g') END,
       draft."marketingEmailOptIn", draft."marketingEmailOptIn", CASE WHEN draft."marketingEmailOptIn" THEN draft."createdAt" ELSE NULL END,
       draft."createdAt", now()
FROM "AppointmentDraft" draft
WHERE draft."submittedAt" IS NULL AND draft."expiresAt" > now() AND draft."phoneNumber" IS NOT NULL
ON CONFLICT ("source", "sourceRecordId") DO NOTHING;

UPDATE "Owner" owner
SET "directoryType" = 'PROSPECT'
WHERE NOT EXISTS (SELECT 1 FROM "AppointmentRequest" appointment WHERE appointment."ownerId" = owner."id")
  AND NOT EXISTS (SELECT 1 FROM "ExternalClientRecord" external_record WHERE external_record."ownerId" = owner."id")
  AND (
    (EXISTS (SELECT 1 FROM "NewPatientRequest" request WHERE request."ownerId" = owner."id")
      AND NOT EXISTS (SELECT 1 FROM "ClientLifecycleRecord" lifecycle WHERE lifecycle."ownerId" = owner."id" AND COALESCE(lifecycle."leadSource", '') NOT IN ('', 'Pending')))
    OR (EXISTS (SELECT 1 FROM "WellnessGiveawayEntry" entry WHERE entry."ownerId" = owner."id")
      AND NOT EXISTS (SELECT 1 FROM "NewPatientRequest" request WHERE request."ownerId" = owner."id")
      AND NOT EXISTS (SELECT 1 FROM "ClientLifecycleRecord" lifecycle WHERE lifecycle."ownerId" = owner."id"))
  );

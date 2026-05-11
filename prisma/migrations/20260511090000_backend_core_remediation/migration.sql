ALTER TABLE "Owner"
ADD COLUMN "normalizedPhone" TEXT;

UPDATE "Owner"
SET "normalizedPhone" = CASE
  WHEN length(regexp_replace("phoneNumber", '\D', '', 'g')) = 10 THEN '1' || regexp_replace("phoneNumber", '\D', '', 'g')
  WHEN length(regexp_replace("phoneNumber", '\D', '', 'g')) = 11
    AND regexp_replace("phoneNumber", '\D', '', 'g') LIKE '1%' THEN regexp_replace("phoneNumber", '\D', '', 'g')
  ELSE regexp_replace("phoneNumber", '\D', '', 'g')
END;

UPDATE "Owner"
SET "normalizedPhone" = NULL
WHERE "normalizedPhone" = '';

CREATE INDEX "Owner_normalizedPhone_idx" ON "Owner"("normalizedPhone");
CREATE INDEX "Pet_ownerId_name_idx" ON "Pet"("ownerId", "name");
CREATE INDEX "Pet_ownerId_species_idx" ON "Pet"("ownerId", "species");

CREATE TABLE "AppointmentPreferredDate" (
  "appointmentRequestId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  CONSTRAINT "AppointmentPreferredDate_pkey" PRIMARY KEY ("appointmentRequestId", "dateKey"),
  CONSTRAINT "AppointmentPreferredDate_appointmentRequestId_fkey"
    FOREIGN KEY ("appointmentRequestId")
    REFERENCES "AppointmentRequest"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "AppointmentPreferredDate_dateKey_appointmentRequestId_idx"
  ON "AppointmentPreferredDate"("dateKey", "appointmentRequestId");

INSERT INTO "AppointmentPreferredDate" ("appointmentRequestId", "dateKey")
SELECT
  request_rows."id",
  LEFT(selection_rows.selection->>'date', 10)
FROM "AppointmentRequest" AS request_rows
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(request_rows."preferredSelections"::jsonb, '[]'::jsonb)) AS selection_rows(selection)
WHERE jsonb_typeof(selection_rows.selection) = 'object'
  AND selection_rows.selection ? 'date'
  AND length(selection_rows.selection->>'date') >= 10
ON CONFLICT DO NOTHING;

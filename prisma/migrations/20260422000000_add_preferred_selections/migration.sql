ALTER TABLE "AppointmentDraft"
ADD COLUMN "preferredSelections" JSONB;

UPDATE "AppointmentDraft"
SET "preferredSelections" = jsonb_build_array(
  jsonb_build_object(
    'date', to_jsonb(to_char("selectedDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    'timeSlots', to_jsonb("selectedTimeSlots")
  )
)
WHERE "selectedDate" IS NOT NULL;

ALTER TABLE "AppointmentRequest"
ADD COLUMN "preferredSelections" JSONB;

UPDATE "AppointmentRequest"
SET "preferredSelections" = jsonb_build_array(
  jsonb_build_object(
    'date', to_jsonb(to_char("selectedDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    'timeSlots', to_jsonb("selectedTimeSlots")
  )
);

ALTER TABLE "AppointmentRequest"
ALTER COLUMN "preferredSelections" SET NOT NULL;

DROP INDEX IF EXISTS "AppointmentRequest_selectedDate_idx";

ALTER TABLE "AppointmentDraft"
DROP COLUMN "selectedDate",
DROP COLUMN "selectedTimeSlots";

ALTER TABLE "AppointmentRequest"
DROP COLUMN "selectedDate",
DROP COLUMN "selectedTimeSlots";

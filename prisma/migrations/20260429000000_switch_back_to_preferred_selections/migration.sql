ALTER TABLE "AppointmentDraft"
ADD COLUMN "preferredSelections" JSONB;

UPDATE "AppointmentDraft"
SET "preferredSelections" = CASE
  WHEN "preferredSlots" IS NULL THEN NULL
  ELSE (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'date',
          to_jsonb(slot_group.date_key || 'T00:00:00.000Z'),
          'timeSlots',
          slot_group.time_slots
        )
        ORDER BY slot_group.date_key
      ),
      '[]'::jsonb
    )
    FROM (
      SELECT
        substring(slot.value, 1, 10) AS date_key,
        jsonb_agg(to_jsonb(substring(slot.value, 12, 5)) ORDER BY slot.ordinality) AS time_slots
      FROM jsonb_array_elements_text("AppointmentDraft"."preferredSlots") WITH ORDINALITY AS slot(value, ordinality)
      GROUP BY substring(slot.value, 1, 10)
    ) AS slot_group
  )
END;

ALTER TABLE "AppointmentDraft"
DROP COLUMN "preferredSlots";

ALTER TABLE "AppointmentRequest"
ADD COLUMN "preferredSelections" JSONB;

UPDATE "AppointmentRequest"
SET "preferredSelections" = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date',
        to_jsonb(slot_group.date_key || 'T00:00:00.000Z'),
        'timeSlots',
        slot_group.time_slots
      )
      ORDER BY slot_group.date_key
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      substring(slot.value, 1, 10) AS date_key,
      jsonb_agg(to_jsonb(substring(slot.value, 12, 5)) ORDER BY slot.ordinality) AS time_slots
    FROM jsonb_array_elements_text("AppointmentRequest"."preferredSlots") WITH ORDINALITY AS slot(value, ordinality)
    GROUP BY substring(slot.value, 1, 10)
  ) AS slot_group
);

ALTER TABLE "AppointmentRequest"
ALTER COLUMN "preferredSelections" SET NOT NULL;

ALTER TABLE "AppointmentRequest"
DROP COLUMN "preferredSlots";

ALTER TABLE "AppointmentDraft"
ADD COLUMN "preferredSlots" JSONB;

UPDATE "AppointmentDraft"
SET "preferredSlots" = CASE
  WHEN "preferredSelections" IS NULL THEN NULL
  ELSE (
    SELECT COALESCE(
      jsonb_agg(
        to_jsonb(
          to_char(
            (
              (
                substring(selection.value->>'date', 1, 10)::date + slot.value::time
              ) AT TIME ZONE COALESCE("AppointmentDraft"."timezone", 'UTC')
            ) AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          )
        )
        ORDER BY selection.ordinality, slot.ordinality
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements("AppointmentDraft"."preferredSelections") WITH ORDINALITY AS selection(value, ordinality)
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(selection.value->'timeSlots', '[]'::jsonb)) WITH ORDINALITY AS slot(value, ordinality)
  )
END;

ALTER TABLE "AppointmentDraft"
DROP COLUMN "preferredSelections";

ALTER TABLE "AppointmentRequest"
ADD COLUMN "preferredSlots" JSONB;

UPDATE "AppointmentRequest"
SET "preferredSlots" = (
  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(
        to_char(
          (
            (
              substring(selection.value->>'date', 1, 10)::date + slot.value::time
            ) AT TIME ZONE "AppointmentRequest"."timezone"
          ) AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        )
      )
      ORDER BY selection.ordinality, slot.ordinality
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements("AppointmentRequest"."preferredSelections") WITH ORDINALITY AS selection(value, ordinality)
  CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(selection.value->'timeSlots', '[]'::jsonb)) WITH ORDINALITY AS slot(value, ordinality)
);

ALTER TABLE "AppointmentRequest"
ALTER COLUMN "preferredSlots" SET NOT NULL;

ALTER TABLE "AppointmentRequest"
DROP COLUMN "preferredSelections";

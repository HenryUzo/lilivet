CREATE TYPE "CalendarSyncStatus" AS ENUM ('NOT_SYNCED', 'SYNCED', 'FAILED');

ALTER TABLE "AppointmentRequest"
ADD COLUMN "confirmedStartAt" TIMESTAMP(3),
ADD COLUMN "confirmedEndAt" TIMESTAMP(3),
ADD COLUMN "confirmedTimezone" TEXT,
ADD COLUMN "confirmedByStaffUserId" TEXT,
ADD COLUMN "calendarEventId" TEXT,
ADD COLUMN "calendarEventUrl" TEXT,
ADD COLUMN "calendarSyncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
ADD COLUMN "calendarSyncedAt" TIMESTAMP(3),
ADD COLUMN "calendarSyncError" TEXT;

CREATE INDEX "AppointmentRequest_confirmedByStaffUserId_idx" ON "AppointmentRequest"("confirmedByStaffUserId");
CREATE INDEX "AppointmentRequest_calendarSyncStatus_idx" ON "AppointmentRequest"("calendarSyncStatus");

ALTER TABLE "AppointmentRequest"
ADD CONSTRAINT "AppointmentRequest_confirmedByStaffUserId_fkey"
FOREIGN KEY ("confirmedByStaffUserId")
REFERENCES "StaffUser"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

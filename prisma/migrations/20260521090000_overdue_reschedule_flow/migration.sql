ALTER TYPE "AppointmentRequestStatus" ADD VALUE 'OVERDUE';

ALTER TABLE "AppointmentRequest"
ADD COLUMN "rescheduleRequestedAt" TIMESTAMP(3),
ADD COLUMN "rescheduleResponseDeadline" TIMESTAMP(3),
ADD COLUMN "rescheduleEmailSentAt" TIMESTAMP(3),
ADD COLUMN "rescheduleTokenIssuedAt" TIMESTAMP(3),
ADD COLUMN "rescheduledFromAppointmentRequestId" TEXT,
ADD COLUMN "replacementAppointmentRequestId" TEXT;

CREATE TABLE "AppointmentRescheduleToken" (
  "id" TEXT NOT NULL,
  "appointmentRequestId" TEXT NOT NULL,
  "appointmentDraftId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdByStaffUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppointmentRescheduleToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentRequest_replacementAppointmentRequestId_key" ON "AppointmentRequest"("replacementAppointmentRequestId");
CREATE INDEX "AppointmentRequest_rescheduledFromAppointmentRequestId_idx" ON "AppointmentRequest"("rescheduledFromAppointmentRequestId");
CREATE INDEX "AppointmentRequest_replacementAppointmentRequestId_idx" ON "AppointmentRequest"("replacementAppointmentRequestId");
CREATE INDEX "AppointmentRequest_rescheduleResponseDeadline_idx" ON "AppointmentRequest"("rescheduleResponseDeadline");

CREATE UNIQUE INDEX "AppointmentRescheduleToken_appointmentDraftId_key" ON "AppointmentRescheduleToken"("appointmentDraftId");
CREATE UNIQUE INDEX "AppointmentRescheduleToken_tokenHash_key" ON "AppointmentRescheduleToken"("tokenHash");
CREATE INDEX "AppointmentRescheduleToken_appointmentRequestId_idx" ON "AppointmentRescheduleToken"("appointmentRequestId");
CREATE INDEX "AppointmentRescheduleToken_expiresAt_idx" ON "AppointmentRescheduleToken"("expiresAt");
CREATE INDEX "AppointmentRescheduleToken_usedAt_idx" ON "AppointmentRescheduleToken"("usedAt");
CREATE INDEX "AppointmentRescheduleToken_createdByStaffUserId_idx" ON "AppointmentRescheduleToken"("createdByStaffUserId");

ALTER TABLE "AppointmentRequest"
ADD CONSTRAINT "AppointmentRequest_rescheduledFromAppointmentRequestId_fkey"
FOREIGN KEY ("rescheduledFromAppointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentRequest"
ADD CONSTRAINT "AppointmentRequest_replacementAppointmentRequestId_fkey"
FOREIGN KEY ("replacementAppointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentRescheduleToken"
ADD CONSTRAINT "AppointmentRescheduleToken_appointmentRequestId_fkey"
FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentRescheduleToken"
ADD CONSTRAINT "AppointmentRescheduleToken_appointmentDraftId_fkey"
FOREIGN KEY ("appointmentDraftId") REFERENCES "AppointmentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentRescheduleToken"
ADD CONSTRAINT "AppointmentRescheduleToken_createdByStaffUserId_fkey"
FOREIGN KEY ("createdByStaffUserId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

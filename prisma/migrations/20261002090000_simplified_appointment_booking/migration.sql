CREATE TYPE "AppointmentBookingMode" AS ENUM ('STANDARD', 'SIMPLIFIED');
CREATE TYPE "AppointmentBookingSource" AS ENUM ('STANDARD', 'SIMPLIFIED');
CREATE TYPE "AppointmentSmsDeliveryKind" AS ENUM ('REQUEST_RECEIVED', 'APPOINTMENT_CONFIRMED');
CREATE TYPE "AppointmentSmsDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'ACCEPTED', 'DELIVERED', 'FAILED');

ALTER TABLE "AppointmentRequest" ADD COLUMN "bookingSource" "AppointmentBookingSource" NOT NULL DEFAULT 'STANDARD';

CREATE TABLE "AppointmentBookingSetting" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "mode" "AppointmentBookingMode" NOT NULL DEFAULT 'STANDARD',
  "updatedByStaffUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentBookingSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentSmsDelivery" (
  "id" TEXT NOT NULL,
  "appointmentRequestId" TEXT NOT NULL,
  "kind" "AppointmentSmsDeliveryKind" NOT NULL,
  "status" "AppointmentSmsDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "messageId" TEXT,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentSmsDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentSmsDelivery_messageId_key" ON "AppointmentSmsDelivery"("messageId");
CREATE INDEX "AppointmentSmsDelivery_appointmentRequestId_createdAt_idx" ON "AppointmentSmsDelivery"("appointmentRequestId", "createdAt");
CREATE INDEX "AppointmentSmsDelivery_status_createdAt_idx" ON "AppointmentSmsDelivery"("status", "createdAt");
ALTER TABLE "AppointmentSmsDelivery" ADD CONSTRAINT "AppointmentSmsDelivery_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import crypto from "crypto";
import type { AppointmentSmsDeliveryKind, AppointmentSmsDeliveryStatus } from "@prisma/client";
import { env } from "../config/env";
import { sendBrevoTransactionalSms } from "../integrations/brevo/brevoClient";
import { prisma } from "../prisma/client";
import { normalizePhoneNumber } from "../utils/phone";

function formatAppointmentTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export async function queueAppointmentSms(input: {
  appointmentRequestId: string;
  phoneNumber: string;
  petName: string;
  startsAt: Date;
  timezone: string;
  kind: AppointmentSmsDeliveryKind;
}) {
  const delivery = await prisma.appointmentSmsDelivery.create({
    data: { appointmentRequestId: input.appointmentRequestId, kind: input.kind }
  });

  if (!env.BREVO_SMS_ENABLED) {
    return prisma.appointmentSmsDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorMessage: "Brevo SMS is not enabled" }
    });
  }

  const requestedTime = formatAppointmentTime(input.startsAt, input.timezone);
  const content = input.kind === "REQUEST_RECEIVED"
    ? `Lili Veterinary Hospital: We received ${input.petName}'s request for ${requestedTime} CT. This time is not confirmed yet; our team will contact you.`
    : `Lili Veterinary Hospital: ${input.petName}'s appointment is confirmed for ${requestedTime} CT. Questions? Call the clinic.`;

  const result = await sendBrevoTransactionalSms({
    recipient: `+${normalizePhoneNumber(input.phoneNumber)}`,
    content,
    tag: input.kind === "REQUEST_RECEIVED" ? "appointment-requested" : "appointment-confirmed"
  });

  if (!result.ok) {
    return prisma.appointmentSmsDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        errorMessage: (result.errorMessage || result.bodyText || "Brevo SMS request failed").slice(0, 1000)
      }
    });
  }

  const messageId = typeof result.data?.messageId === "number" || typeof result.data?.messageId === "string"
    ? String(result.data.messageId)
    : null;
  return prisma.appointmentSmsDelivery.update({
    where: { id: delivery.id },
    data: { status: "SENT", messageId, sentAt: new Date() }
  });
}

export async function recordAppointmentSmsWebhook(input: { messageId?: string; event?: string; status?: string; reason?: string }) {
  if (!input.messageId) return null;
  const event = `${input.event ?? ""} ${input.status ?? ""}`.toLowerCase();
  let status: AppointmentSmsDeliveryStatus | null = null;
  if (event.includes("delivered")) status = "DELIVERED";
  else if (event.includes("accepted") || event.includes("sent")) status = "ACCEPTED";
  else if (event.includes("bounce") || event.includes("reject") || event.includes("fail")) status = "FAILED";
  if (!status) return null;
  return prisma.appointmentSmsDelivery.updateMany({
    where: { messageId: input.messageId },
    data: {
      status,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
      errorMessage: status === "FAILED" ? (input.reason || "Brevo rejected the SMS").slice(0, 1000) : undefined
    }
  });
}

export function hasValidSmsWebhookSecret(value: string | undefined) {
  if (!value || !env.BREVO_SMS_WEBHOOK_SECRET) return false;
  const expected = Buffer.from(env.BREVO_SMS_WEBHOOK_SECRET);
  const actual = Buffer.from(value);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

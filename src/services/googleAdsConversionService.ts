import { env } from "../config/env";
import { prisma } from "../prisma/client";

type ConversionGoal = "BOOKED" | "ATTENDED";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatGoogleAdsDateTime(date: Date, timeZone = "America/Chicago") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const offset = value("timeZoneName").replace("GMT", "") || "+00:00";
  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}:${value("second")}${offset}`;
}

async function accessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed with status ${response.status}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google OAuth token response did not include an access token");
  return payload.access_token;
}

export async function reportAppointmentConversion(appointmentRequestId: string, goal: ConversionGoal) {
  if (!env.GOOGLE_ADS_OFFLINE_CONVERSIONS_ENABLED) return;
  const request = await prisma.appointmentRequest.findUnique({ where: { id: appointmentRequestId } });
  if (!request) return;
  if (goal === "BOOKED" && request.googleAdsBookedUploadedAt) return;
  if (goal === "ATTENDED" && request.googleAdsAttendedUploadedAt) return;

  const clickId = request.gclid
    ? { gclid: request.gclid }
    : request.gbraid
      ? { gbraid: request.gbraid }
      : request.wbraid
        ? { wbraid: request.wbraid }
        : null;
  if (!clickId) return;

  const actionId = goal === "BOOKED"
    ? env.GOOGLE_ADS_BOOKED_CONVERSION_ACTION_ID
    : env.GOOGLE_ADS_ATTENDED_CONVERSION_ACTION_ID;
  const conversionAt = request.updatedAt;
  const customerId = digitsOnly(env.GOOGLE_ADS_CUSTOMER_ID);

  try {
    const token = await accessToken();
    const response = await fetch(`https://googleads.googleapis.com/${env.GOOGLE_ADS_API_VERSION}/customers/${customerId}:uploadClickConversions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(env.GOOGLE_ADS_MANAGER_CUSTOMER_ID ? { "login-customer-id": digitsOnly(env.GOOGLE_ADS_MANAGER_CUSTOMER_ID) } : {})
      },
      body: JSON.stringify({
        customerId,
        partialFailure: true,
        conversions: [{
          ...clickId,
          conversionAction: `customers/${customerId}/conversionActions/${digitsOnly(actionId)}`,
          conversionDateTime: formatGoogleAdsDateTime(conversionAt, request.confirmedTimezone ?? request.timezone),
          orderId: `${request.id}:${goal.toLowerCase()}`,
          conversionEnvironment: "WEB"
        }]
      })
    });
    const payload = await response.json() as { partialFailureError?: { message?: string } };
    if (!response.ok || payload.partialFailureError) {
      throw new Error(payload.partialFailureError?.message || `Google Ads conversion upload failed with status ${response.status}`);
    }
    await prisma.appointmentRequest.update({
      where: { id: request.id },
      data: {
        ...(goal === "BOOKED" ? { googleAdsBookedUploadedAt: new Date() } : { googleAdsAttendedUploadedAt: new Date() }),
        googleAdsUploadError: null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Google Ads conversion upload error";
    await prisma.appointmentRequest.update({ where: { id: request.id }, data: { googleAdsUploadError: message.slice(0, 2000) } });
    throw error;
  }
}

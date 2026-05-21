import type {
  AppointmentRequest,
  AppointmentRequestStatus,
  Owner,
  Pet,
  Prisma
} from "@prisma/client";
import { env } from "../config/env";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
};

type GoogleCalendarEventResponse = {
  id: string;
  htmlLink?: string;
};

export type AppointmentCalendarRecord = AppointmentRequest & {
  owner: Owner;
  pet: Pet;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function requireCalendarConfig() {
  const missing = [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_REFRESH_TOKEN",
    "GOOGLE_CALENDAR_ID"
  ].filter((key) => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    throw new Error(`Google Calendar integration is not configured: ${missing.join(", ")}`);
  }
}

function formatVisitType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAppointmentDescription(request: AppointmentCalendarRecord) {
  return [
    `Request ID: ${request.id}`,
    `Owner: ${request.owner.firstName} ${request.owner.lastName}`,
    `Phone: ${request.owner.phoneNumber}`,
    `Email: ${request.owner.email ?? "Not provided"}`,
    `Pet: ${request.pet.name}`,
    `Species: ${request.pet.species}`,
    `Breed: ${request.pet.breed ?? "Not provided"}`,
    `Visit Type: ${formatVisitType(request.visitType)}`,
    `Timezone: ${request.confirmedTimezone ?? request.timezone ?? "Not provided"}`,
    `Symptoms: ${request.symptomsOrConcerns ?? "Not provided"}`,
    `Current Medications: ${request.currentMedications ?? "Not provided"}`,
    `Previous Veterinarian: ${request.previousVeterinarian ?? "Not provided"}`,
    `Symptom Duration: ${request.symptomDuration ?? "Not provided"}`
  ].join("\n");
}

async function getAccessToken() {
  requireCalendarConfig();

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      refresh_token: env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GoogleTokenResponse;
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  };

  return data.access_token;
}

async function calendarRequest<T>(
  path: string,
  init: RequestInit,
  allowNotFound = false
) {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    }
  );

  if (allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar request failed with status ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
}

function buildEventPayload(request: AppointmentCalendarRecord) {
  if (!request.confirmedStartAt || !request.confirmedEndAt || !request.confirmedTimezone) {
    throw new Error("Confirmed appointment is missing start, end, or timezone");
  }

  return {
    summary: `${request.pet.name} - ${formatVisitType(request.visitType)}`,
    description: buildAppointmentDescription(request),
    start: {
      dateTime: request.confirmedStartAt.toISOString(),
      timeZone: request.confirmedTimezone
    },
    end: {
      dateTime: request.confirmedEndAt.toISOString(),
      timeZone: request.confirmedTimezone
    }
  };
}

export async function createOrUpdateCalendarEvent(request: AppointmentCalendarRecord) {
  const payload = buildEventPayload(request);

  if (request.calendarEventId) {
    const event = await calendarRequest<GoogleCalendarEventResponse>(
      `/events/${encodeURIComponent(request.calendarEventId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      }
    );

    if (!event) {
      throw new Error("Google Calendar event update returned an empty response");
    }

    return {
      calendarEventId: event.id,
      calendarEventUrl: event.htmlLink ?? null
    };
  }

  const event = await calendarRequest<GoogleCalendarEventResponse>("/events", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!event) {
    throw new Error("Google Calendar event creation returned an empty response");
  }

  return {
    calendarEventId: event.id,
    calendarEventUrl: event.htmlLink ?? null
  };
}

export async function deleteCalendarEvent(request: AppointmentCalendarRecord) {
  if (!request.calendarEventId) {
    return;
  }

  await calendarRequest(
    `/events/${encodeURIComponent(request.calendarEventId)}`,
    {
      method: "DELETE"
    },
    true
  );
}

export function getCalendarSyncErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function getCalendarSyncUpdate(data: {
  status: AppointmentRequestStatus;
  calendarEventId?: string | null;
  calendarEventUrl?: string | null;
  error?: string | null;
}): Prisma.AppointmentRequestUpdateInput {
  if (data.error) {
    return {
      calendarSyncStatus: "FAILED",
      calendarSyncError: data.error,
      calendarSyncedAt: null
    };
  }

  if (data.status === "CANCELLED") {
    return {
      calendarEventId: null,
      calendarEventUrl: null,
      calendarSyncStatus: "NOT_SYNCED",
      calendarSyncError: null,
      calendarSyncedAt: new Date()
    };
  }

  return {
    calendarEventId: data.calendarEventId ?? null,
    calendarEventUrl: data.calendarEventUrl ?? null,
    calendarSyncStatus: "SYNCED",
    calendarSyncError: null,
    calendarSyncedAt: new Date()
  };
}

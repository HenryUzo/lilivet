import type { AppointmentRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import {
  hasAnyFuturePreferredSelection,
  normalizePreferredSelections,
  normalizeDateFilterBoundary
} from "../utils/preferredSelections";
import {
  createOrUpdateCalendarEvent,
  deleteCalendarEvent,
  getCalendarSyncErrorMessage,
  getCalendarSyncUpdate,
  type AppointmentCalendarRecord
} from "./googleCalendarService";
import { dispatchBackgroundEmail } from "./emailDispatchService";
import { sendClientConfirmedAppointmentDetails } from "./mailService";

const appointmentRequestInclude = {
  owner: true,
  pet: true,
  files: true,
  draft: true,
  replacementAppointmentRequest: {
    select: {
      id: true,
      status: true,
      createdAt: true
    }
  }
} satisfies Prisma.AppointmentRequestInclude;

type UpdateAppointmentRequestStatusInput = {
  id: string;
  status: AppointmentRequestStatus;
  confirmedStartAt?: string;
  confirmedEndAt?: string;
  confirmedTimezone?: string;
  staffUserId: string;
};

export async function listAppointmentRequests(input: {
  status?: AppointmentRequestStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
}) {
  const dateFromKey = normalizeDateFilterBoundary(input.dateFrom);
  const dateToKey = normalizeDateFilterBoundary(input.dateTo);

  const where: Prisma.AppointmentRequestWhereInput = {
    status: input.status
  };

  if (input.search) {
    where.OR = [
      { owner: { firstName: { contains: input.search, mode: "insensitive" } } },
      { owner: { lastName: { contains: input.search, mode: "insensitive" } } },
      { owner: { email: { contains: input.search, mode: "insensitive" } } },
      { owner: { phoneNumber: { contains: input.search, mode: "insensitive" } } },
      { pet: { name: { contains: input.search, mode: "insensitive" } } }
    ];
  }

  if (dateFromKey || dateToKey) {
    where.preferredDateSelections = {
      some: {
        dateKey: {
          gte: dateFromKey,
          lte: dateToKey
        }
      }
    };
  }

  const rows = await prisma.appointmentRequest.findMany({
    where,
    take: input.limit + 1,
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { owner: true, pet: true, files: true }
  });

  const hasMore = rows.length > input.limit;
  const data = hasMore ? rows.slice(0, input.limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;
  return { data, nextCursor };
}

export async function getAppointmentRequest(id: string) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id },
    include: appointmentRequestInclude
  });
  if (!request) throw new HttpError(404, "Appointment request not found");
  return request;
}

export async function markOverdueAppointments(now = new Date()) {
  const result = await prisma.appointmentRequest.updateMany({
    where: {
      status: "CONFIRMED",
      confirmedEndAt: { lt: now }
    },
    data: {
      status: "OVERDUE"
    }
  });

  return result.count;
}

function shouldSyncCalendarOnStatusChange(request: AppointmentCalendarRecord, status: AppointmentRequestStatus) {
  if (status === "CONFIRMED") {
    return true;
  }

  if (status === "CANCELLED") {
    return Boolean(request.calendarEventId);
  }

  return false;
}

async function syncCalendarState(request: AppointmentCalendarRecord) {
  if (request.status === "CONFIRMED") {
    const event = await createOrUpdateCalendarEvent(request);
    return getCalendarSyncUpdate({
      status: request.status,
      calendarEventId: event.calendarEventId,
      calendarEventUrl: event.calendarEventUrl
    });
  }

  if (request.status === "CANCELLED" && request.calendarEventId) {
    await deleteCalendarEvent(request);
    return getCalendarSyncUpdate({ status: request.status });
  }

  throw new HttpError(409, "Appointment does not have a calendar sync action to retry");
}

export async function updateAppointmentRequestStatus(input: UpdateAppointmentRequestStatusInput) {
  const existing = await getAppointmentRequest(input.id);
  const willSendClientConfirmationEmail =
    input.status === "CONFIRMED" &&
    existing.status !== "CONFIRMED" &&
    Boolean(existing.owner.email);

  const updateData: Prisma.AppointmentRequestUpdateInput = {
    status: input.status
  };

  if (input.status === "CONFIRMED") {
    const confirmedStartAt = new Date(input.confirmedStartAt!);

    if (confirmedStartAt <= new Date()) {
      throw new HttpError(400, "Confirmed appointment time must be in the future.");
    }

    if (
      existing.status === "PENDING_REVIEW" &&
      normalizePreferredSelections(existing.preferredSelections).length > 0 &&
      !hasAnyFuturePreferredSelection(
        existing.preferredSelections,
        existing.timezone ?? input.confirmedTimezone ?? "Africa/Lagos"
      )
    ) {
      throw new HttpError(
        409,
        "This request can no longer be confirmed because all requested times have passed."
      );
    }

    updateData.confirmedStartAt = new Date(input.confirmedStartAt!);
    updateData.confirmedEndAt = new Date(input.confirmedEndAt!);
    updateData.confirmedTimezone = input.confirmedTimezone!;
    updateData.confirmedByStaffUser = {
      connect: { id: input.staffUserId }
    };
  }

  let updated = await prisma.appointmentRequest.update({
    where: { id: input.id },
    data: updateData,
    include: appointmentRequestInclude
  });

  if (input.status === "CANCELLED" && !existing.calendarEventId) {
    return prisma.appointmentRequest.update({
      where: { id: input.id },
      data: getCalendarSyncUpdate({ status: input.status }),
      include: appointmentRequestInclude
    });
  }

  if (!shouldSyncCalendarOnStatusChange(existing as AppointmentCalendarRecord, input.status)) {
    return updated;
  }

  try {
    const calendarUpdate = await syncCalendarState(updated);
    updated = await prisma.appointmentRequest.update({
      where: { id: input.id },
      data: calendarUpdate,
      include: appointmentRequestInclude
    });
  } catch (error) {
    const syncError = getCalendarSyncErrorMessage(error);

    updated = await prisma.appointmentRequest.update({
      where: { id: input.id },
      data: getCalendarSyncUpdate({
        status: input.status,
        error: syncError
      }),
      include: appointmentRequestInclude
    });
  }

  if (
    willSendClientConfirmationEmail &&
    updated.confirmedStartAt &&
    updated.confirmedEndAt &&
    updated.confirmedTimezone
  ) {
    const confirmedStartAt = updated.confirmedStartAt;
    const confirmedEndAt = updated.confirmedEndAt;
    const confirmedTimezone = updated.confirmedTimezone;

    dispatchBackgroundEmail({
      requestId: updated.id,
      requestType: "appointment",
      notificationType: "client",
      task: () =>
        sendClientConfirmedAppointmentDetails({
          email: updated.owner.email ?? undefined,
          ownerName: updated.owner.firstName,
          petName: updated.pet.name,
          visitType: updated.visitType,
          confirmedStartAt,
          confirmedEndAt,
          confirmedTimezone
        })
    });
  }

  return updated;
}

export async function retryAppointmentCalendarSync(id: string) {
  const request = await getAppointmentRequest(id);

  if (!shouldSyncCalendarOnStatusChange(request as AppointmentCalendarRecord, request.status)) {
    throw new HttpError(409, "Appointment does not have a calendar sync action to retry");
  }

  try {
    const calendarUpdate = await syncCalendarState(request);
    return prisma.appointmentRequest.update({
      where: { id },
      data: calendarUpdate,
      include: appointmentRequestInclude
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    return prisma.appointmentRequest.update({
      where: { id },
      data: getCalendarSyncUpdate({
        status: request.status,
        error: getCalendarSyncErrorMessage(error)
      }),
      include: appointmentRequestInclude
    });
  }
}

import type { AppointmentRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";

function hasPreferredSelectionInRange(
  preferredSelections: Prisma.JsonValue,
  dateFrom?: string,
  dateTo?: string
) {
  if (!dateFrom && !dateTo) return true;
  if (!Array.isArray(preferredSelections)) return false;

  const from = dateFrom ? new Date(dateFrom).getTime() : Number.NEGATIVE_INFINITY;
  const to = dateTo ? new Date(dateTo).getTime() : Number.POSITIVE_INFINITY;

  return preferredSelections.some((selection) => {
    if (!selection || typeof selection !== "object" || !("date" in selection)) return false;
    const time = new Date(String(selection.date)).getTime();
    return Number.isFinite(time) && time >= from && time <= to;
  });
}

export async function listAppointmentRequests(input: {
  status?: AppointmentRequestStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
}) {
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

  const needsDateFilter = Boolean(input.dateFrom || input.dateTo);
  const rows = await prisma.appointmentRequest.findMany({
    where,
    take: needsDateFilter ? 500 : input.limit + 1,
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: { owner: true, pet: true, files: true }
  });

  const filteredRows = rows.filter((row) => hasPreferredSelectionInRange(row.preferredSelections, input.dateFrom, input.dateTo));
  const hasMore = filteredRows.length > input.limit || (needsDateFilter && rows.length === 500);
  const data = filteredRows.slice(0, input.limit);
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? rows[rows.length - 1]?.id ?? null : null;
  return { data, nextCursor };
}

export async function getAppointmentRequest(id: string) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id },
    include: { owner: true, pet: true, files: true, draft: true }
  });
  if (!request) throw new HttpError(404, "Appointment request not found");
  return request;
}

export async function updateAppointmentRequestStatus(id: string, status: AppointmentRequestStatus) {
  await getAppointmentRequest(id);
  return prisma.appointmentRequest.update({
    where: { id },
    data: { status },
    include: { owner: true, pet: true, files: true }
  });
}

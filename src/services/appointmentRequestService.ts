import type { AppointmentRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import { normalizeDateFilterBoundary } from "../utils/preferredSelections";

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

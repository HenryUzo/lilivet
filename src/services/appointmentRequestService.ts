import type { AppointmentRequestStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";

export async function listAppointmentRequests(input: {
  status?: AppointmentRequestStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
}) {
  const where: Prisma.AppointmentRequestWhereInput = {
    status: input.status,
    selectedDate: {
      gte: input.dateFrom ? new Date(input.dateFrom) : undefined,
      lte: input.dateTo ? new Date(input.dateTo) : undefined
    }
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

  const rows = await prisma.appointmentRequest.findMany({
    where,
    take: input.limit + 1,
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: { owner: true, pet: true, files: true }
  });

  const hasMore = rows.length > input.limit;
  const data = hasMore ? rows.slice(0, input.limit) : rows;
  return { data, nextCursor: hasMore ? data[data.length - 1]?.id : null };
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

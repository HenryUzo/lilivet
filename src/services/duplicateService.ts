import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

function windowStart() {
  return new Date(Date.now() - env.DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000);
}

export async function findDuplicateAppointmentCandidate(input: {
  phoneNumber: string;
  email?: string;
  petName: string;
}) {
  return prisma.appointmentRequest.findFirst({
    where: {
      createdAt: { gte: windowStart() },
      pet: { name: { equals: input.petName, mode: "insensitive" } },
      owner: {
        OR: [
          { phoneNumber: input.phoneNumber },
          ...(input.email ? [{ email: input.email } satisfies Prisma.OwnerWhereInput] : [])
        ]
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function findDuplicateNewPatientCandidate(input: {
  phoneNumber: string;
  email?: string;
  petName: string;
}) {
  return prisma.newPatientRequest.findFirst({
    where: {
      createdAt: { gte: windowStart() },
      petName: { equals: input.petName, mode: "insensitive" },
      OR: [
        { ownerPhoneNumber: input.phoneNumber },
        ...(input.email ? [{ ownerEmail: input.email } satisfies Prisma.NewPatientRequestWhereInput] : [])
      ]
    },
    orderBy: { createdAt: "desc" }
  });
}

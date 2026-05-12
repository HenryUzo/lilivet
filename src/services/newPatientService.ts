import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type { CreateNewPatientRequestInput } from "../validators/newPatientSchemas";
import { findDuplicateNewPatientCandidate } from "./duplicateService";
import { assertUnattachedFilesAvailable, attachFilesToNewPatientRequest } from "./fileService";
import { sendClinicNewPatientNotification } from "./mailService";
import { dispatchBackgroundEmail } from "./emailDispatchService";

export async function createNewPatientRequest(input: CreateNewPatientRequestInput) {
  const duplicate = await findDuplicateNewPatientCandidate({
    phoneNumber: input.owner.phoneNumber,
    email: input.owner.email,
    petName: input.pet.petName
  });

  const requestId = await prisma.$transaction(async (tx) => {
    await assertUnattachedFilesAvailable(input.uploadedFileIds, tx);

    const request = await tx.newPatientRequest.create({
      data: {
        ownerFullName: input.owner.fullName,
        ownerEmail: input.owner.email,
        ownerPhoneNumber: input.owner.phoneNumber,
        reasonForVisit: input.visit.reasonForVisit,
        isUrgent: input.visit.isUrgent,
        preferredDateTime: input.visit.preferredDateTime ? new Date(input.visit.preferredDateTime) : undefined,
        timezone: input.visit.timezone,
        previousVetClinic: input.visit.previousVetClinic,
        consentToElectronicComms: input.visit.consentToElectronicComms,
        petName: input.pet.petName,
        species: input.pet.species,
        breed: input.pet.breed,
        age: input.pet.age,
        sex: input.pet.sex,
        weightLbs: input.pet.weightLbs ? new Prisma.Decimal(input.pet.weightLbs) : undefined,
        spayedNeutered: input.pet.spayedNeutered,
        currentMedications: input.pet.currentMedications,
        existingConditions: input.pet.existingConditions,
        possibleDuplicate: Boolean(duplicate),
        duplicateOfId: duplicate?.id
      }
    });

    await attachFilesToNewPatientRequest(tx, input.uploadedFileIds, request.id);
    return request.id;
  });

  dispatchBackgroundEmail({
    requestId,
    requestType: "new_patient",
    notificationType: "clinic",
    task: () =>
      sendClinicNewPatientNotification({
        requestId,
        ownerName: input.owner.fullName,
        petName: input.pet.petName,
        phoneNumber: input.owner.phoneNumber
      })
  });

  return prisma.newPatientRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { files: true }
  });
}

export async function listNewPatientRequests(input: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
}) {
  const where: Prisma.NewPatientRequestWhereInput = {
    createdAt: {
      gte: input.dateFrom ? new Date(input.dateFrom) : undefined,
      lte: input.dateTo ? new Date(input.dateTo) : undefined
    }
  };

  if (input.search) {
    where.OR = [
      { ownerFullName: { contains: input.search, mode: "insensitive" } },
      { ownerEmail: { contains: input.search, mode: "insensitive" } },
      { ownerPhoneNumber: { contains: input.search, mode: "insensitive" } },
      { petName: { contains: input.search, mode: "insensitive" } },
      { reasonForVisit: { contains: input.search, mode: "insensitive" } }
    ];
  }

  const rows = await prisma.newPatientRequest.findMany({
    where,
    take: input.limit + 1,
    skip: input.cursor ? 1 : 0,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: { files: true }
  });

  const hasMore = rows.length > input.limit;
  const data = hasMore ? rows.slice(0, input.limit) : rows;
  return { data, nextCursor: hasMore ? data[data.length - 1]?.id : null };
}

export async function getNewPatientRequest(id: string) {
  const request = await prisma.newPatientRequest.findUnique({
    where: { id },
    include: { files: true }
  });
  if (!request) throw new HttpError(404, "New patient request not found");
  return request;
}

import crypto from "crypto";
import { Prisma, type NewPatientReferralSource } from "@prisma/client";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import type {
  CaptureNewPatientReferralSourceInput,
  CreateNewPatientRequestInput,
  NewPatientListQueryInput
} from "../validators/newPatientSchemas";
import { findDuplicateNewPatientCandidate } from "./duplicateService";
import { assertUnattachedFilesAvailable, attachFilesToNewPatientRequest } from "./fileService";
import { sendClinicNewPatientNotification } from "./mailService";
import { dispatchBackgroundEmail } from "./emailDispatchService";
import { normalizePhoneNumber } from "../utils/phone";
import { recordMarketingConsent } from "./clientCommunicationService";

const REFERRAL_SOURCE_CAPTURE_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function createCaptureToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type NewPatientRequestWithFiles = Prisma.NewPatientRequestGetPayload<{
  include: { files: true };
}>;

export type NewPatientCreateResponse = NewPatientRequestWithFiles & {
  referralSourceCaptureToken: string;
};

export async function createNewPatientRequest(
  input: CreateNewPatientRequestInput
): Promise<NewPatientCreateResponse> {
  const duplicate = await findDuplicateNewPatientCandidate({
    phoneNumber: input.owner.phoneNumber,
    email: input.owner.email,
    petName: input.pet.petName
  });

  const rawCaptureToken = createCaptureToken();
  const captureTokenHash = hashToken(rawCaptureToken);
  const captureTokenExpiresAt = new Date(Date.now() + REFERRAL_SOURCE_CAPTURE_TOKEN_TTL_MS);

  const requestId = await prisma.$transaction(async (tx) => {
    await assertUnattachedFilesAvailable(input.uploadedFileIds ?? [], tx);

    const [firstName, ...lastNameParts] = input.owner.fullName.trim().split(/\s+/);
    const normalizedPhone = normalizePhoneNumber(input.owner.phoneNumber);
    const owner = normalizedPhone
      ? await tx.owner.findFirst({ where: { normalizedPhone }, orderBy: { createdAt: "asc" } })
      : null;
    const resolvedOwner = owner ?? await tx.owner.create({
      data: { firstName, lastName: lastNameParts.join(" ") || "Client", email: input.owner.email || undefined, phoneNumber: input.owner.phoneNumber, normalizedPhone: normalizedPhone || undefined }
    });
    if (owner && !owner.email && input.owner.email) {
      await tx.owner.update({ where: { id: owner.id }, data: { email: input.owner.email } });
    }
    const existingPet = await tx.pet.findFirst({ where: { ownerId: resolvedOwner.id, species: input.pet.species, name: { equals: input.pet.petName, mode: "insensitive" } } });
    const resolvedPet = existingPet ?? await tx.pet.create({
      data: { ownerId: resolvedOwner.id, name: input.pet.petName, species: input.pet.species, breed: input.pet.breed || undefined, age: input.pet.age || undefined, sex: input.pet.sex, weightLbs: input.pet.weightLbs ? new Prisma.Decimal(input.pet.weightLbs) : undefined, spayedNeutered: input.pet.spayedNeutered, currentMedications: input.pet.currentMedications || undefined, existingConditions: input.pet.existingConditions || undefined }
    });
    await tx.clientLifecycleRecord.upsert({
      where: { ownerId_petId: { ownerId: resolvedOwner.id, petId: resolvedPet.id } },
      create: { ownerId: resolvedOwner.id, petId: resolvedPet.id, leadSource: "Pending", regularVeterinarian: input.visit.previousVetClinic || undefined, firstVisitType: input.visit.reasonForVisit, followUpNeeded: input.visit.isUrgent, lastVisitAt: input.visit.preferredDateTime ? new Date(input.visit.preferredDateTime) : undefined },
      update: { regularVeterinarian: input.visit.previousVetClinic || undefined, firstVisitType: input.visit.reasonForVisit, followUpNeeded: input.visit.isUrgent }
    });
    if (input.visit.marketingEmailOptIn || input.visit.marketingSmsOptIn) {
      await recordMarketingConsent(tx, resolvedOwner.id, {
        emailOptIn: Boolean(input.visit.marketingEmailOptIn),
        smsOptIn: Boolean(input.visit.marketingSmsOptIn),
        source: "new-patient-form"
      });
    }

    const request = await tx.newPatientRequest.create({
      data: {
        ownerFullName: input.owner.fullName,
        ownerEmail: input.owner.email,
        ownerPhoneNumber: input.owner.phoneNumber,
        reasonForVisit: input.visit.reasonForVisit,
        isUrgent: input.visit.isUrgent,
        preferredDateTime: input.visit.preferredDateTime
          ? new Date(input.visit.preferredDateTime)
          : undefined,
        timezone: input.visit.timezone,
        previousVetClinic: input.visit.previousVetClinic,
        consentToElectronicComms: input.visit.consentToElectronicComms,
        marketingEmailOptIn: Boolean(input.visit.marketingEmailOptIn),
        marketingSmsOptIn: Boolean(input.visit.marketingSmsOptIn),
        ownerId: resolvedOwner.id,
        petId: resolvedPet.id,
        referralSourceCaptureTokenHash: captureTokenHash,
        referralSourceCaptureTokenExpiresAt: captureTokenExpiresAt,
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

    await attachFilesToNewPatientRequest(tx, input.uploadedFileIds ?? [], request.id);
    return request.id;
  });

  const request = await prisma.newPatientRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { files: true }
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

  return {
    ...request,
    referralSourceCaptureToken: rawCaptureToken
  };
}

export async function captureNewPatientReferralSource(
  id: string,
  input: CaptureNewPatientReferralSourceInput
) {
  const request = await prisma.newPatientRequest.findUnique({
    where: { id },
    include: { files: true }
  });

  if (!request) {
    throw new HttpError(404, "New patient request not found");
  }

  if (!request.referralSourceCaptureTokenHash || !request.referralSourceCaptureTokenExpiresAt) {
    throw new HttpError(409, "Referral source is no longer available for this request");
  }

  if (request.referralSourceCaptureTokenExpiresAt <= new Date()) {
    throw new HttpError(410, "Referral source capture has expired");
  }

  if (request.referralSourceCaptureTokenHash !== hashToken(input.token)) {
    throw new HttpError(404, "Referral source token is invalid");
  }

  const updated = await prisma.newPatientRequest.update({
    where: { id },
    data: {
      referralSource: input.source,
      referralSourceOther: input.source === "OTHER" ? input.otherText : null,
      referralSourceCapturedAt: new Date(),
      referralSourceCaptureTokenHash: null,
      referralSourceCaptureTokenExpiresAt: null
    },
    include: { files: true }
  });
  if (updated.ownerId && updated.petId) {
    await prisma.clientLifecycleRecord.updateMany({
      where: { ownerId: updated.ownerId, petId: updated.petId },
      data: { leadSource: input.source === "OTHER" ? input.otherText ?? "Other" : input.source, referredBy: input.source === "OTHER" ? input.otherText ?? undefined : undefined }
    });
  }
  return updated;
}

export async function listNewPatientRequests(input: NewPatientListQueryInput) {
  const where: Prisma.NewPatientRequestWhereInput = {
    createdAt: {
      gte: input.dateFrom ? new Date(input.dateFrom) : undefined,
      lte: input.dateTo ? new Date(input.dateTo) : undefined
    }
  };

  if (input.referralSource === "NOT_CAPTURED") {
    where.referralSource = null;
  } else if (input.referralSource) {
    where.referralSource = input.referralSource as NewPatientReferralSource;
  }

  if (input.search) {
    where.OR = [
      { ownerFullName: { contains: input.search, mode: "insensitive" } },
      { ownerEmail: { contains: input.search, mode: "insensitive" } },
      { ownerPhoneNumber: { contains: input.search, mode: "insensitive" } },
      { petName: { contains: input.search, mode: "insensitive" } },
      { reasonForVisit: { contains: input.search, mode: "insensitive" } },
      { referralSourceOther: { contains: input.search, mode: "insensitive" } }
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

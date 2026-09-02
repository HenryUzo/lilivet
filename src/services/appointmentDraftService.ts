import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import {
  appointmentStep1Schema,
  appointmentStep2Schema,
  appointmentStep3Schema,
  appointmentStep4Schema,
  appointmentStep5Schema,
  fullAppointmentDraftSchema,
  type AppointmentStep1,
  type AppointmentStep2,
  type AppointmentStep3,
  type AppointmentStep4,
  type AppointmentStep5
} from "../validators/appointmentDraftSchemas";
import { findDuplicateAppointmentCandidate } from "./duplicateService";
import { attachFilesToAppointmentRequest } from "./fileService";
import { sendClientAppointmentConfirmation, sendClinicAppointmentNotification } from "./mailService";
import { normalizePhoneNumber } from "../utils/phone";
import { extractPreferredSelectionDateKeys } from "../utils/preferredSelections";
import { dispatchBackgroundEmail } from "./emailDispatchService";
import { recordMarketingConsent } from "./clientCommunicationService";

function draftExpiryDate() {
  return new Date(Date.now() + env.DRAFT_EXPIRY_HOURS * 60 * 60 * 1000);
}

async function getActiveDraft(sessionToken: string) {
  const draft = await prisma.appointmentDraft.findUnique({
    where: { sessionToken },
    include: { files: true, appointmentRequest: true }
  });

  if (!draft) {
    throw new HttpError(404, "Appointment draft not found");
  }
  if (draft.expiresAt <= new Date()) {
    throw new HttpError(410, "Appointment draft has expired");
  }
  return draft;
}

async function resolveOwner(
  tx: Prisma.TransactionClient,
  input: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phoneNumber: string;
    preferredContactMethod: "CALL" | "TEXT" | "EMAIL";
  }
) {
  const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
  const existingOwner = normalizedPhone
    ? await tx.owner.findFirst({
        where: { normalizedPhone },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      })
    : null;

  if (!existingOwner) {
    return tx.owner.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? undefined,
        phoneNumber: input.phoneNumber,
        ...(normalizedPhone ? { normalizedPhone } : {}),
        preferredContactMethod: input.preferredContactMethod
      }
    });
  }

  const update: Prisma.OwnerUpdateInput = {};

  if (!existingOwner.email && input.email) {
    update.email = input.email;
  }

  if (!existingOwner.preferredContactMethod && input.preferredContactMethod) {
    update.preferredContactMethod = input.preferredContactMethod;
  }

  if (Object.keys(update).length === 0) {
    return existingOwner;
  }

  return tx.owner.update({
    where: { id: existingOwner.id },
    data: update
  });
}

async function resolvePet(
  tx: Prisma.TransactionClient,
  ownerId: string,
  input: {
    petName: string;
    species: "DOG" | "CAT";
    breed?: string | null;
    approximateAgeYears?: number | null;
    sex: "MALE" | "FEMALE";
    weightLbs?: number | null;
    currentMedications?: string | null;
  }
) {
  const existingPet = await tx.pet.findFirst({
    where: {
      ownerId,
      species: input.species,
      name: { equals: input.petName, mode: "insensitive" }
    }
  });

  if (!existingPet) {
    return tx.pet.create({
      data: {
        ownerId,
        name: input.petName,
        species: input.species,
        breed: input.breed ?? undefined,
        approximateAgeYears: input.approximateAgeYears ?? undefined,
        sex: input.sex,
        weightLbs: input.weightLbs ? new Prisma.Decimal(input.weightLbs) : undefined,
        currentMedications: input.currentMedications ?? undefined
      }
    });
  }

  const update: Prisma.PetUpdateInput = {};

  if (!existingPet.breed && input.breed) {
    update.breed = input.breed;
  }

  if (existingPet.approximateAgeYears === null && input.approximateAgeYears !== null && input.approximateAgeYears !== undefined) {
    update.approximateAgeYears = input.approximateAgeYears;
  }

  if (!existingPet.currentMedications && input.currentMedications) {
    update.currentMedications = input.currentMedications;
  }

  if (existingPet.weightLbs === null && input.weightLbs) {
    update.weightLbs = new Prisma.Decimal(input.weightLbs);
  }

  if (Object.keys(update).length === 0) {
    return existingPet;
  }

  return tx.pet.update({
    where: { id: existingPet.id },
    data: update
  });
}

export async function createAppointmentDraft() {
  const tokenStartedAt = Date.now();
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const tokenDurationMs = Date.now() - tokenStartedAt;

  const queryStartedAt = Date.now();
  const draft = await prisma.appointmentDraft.create({
    data: {
      sessionToken,
      expiresAt: draftExpiryDate()
    }
  });
  const queryDurationMs = Date.now() - queryStartedAt;

  console.log(JSON.stringify({
    event: "appointment_draft_create_query",
    draftId: draft.id,
    tokenDurationMs,
    queryDurationMs,
    createdAt: draft.createdAt.toISOString()
  }));

  return {
    ...draft,
    files: []
  };
}

export async function getAppointmentDraft(sessionToken: string) {
  return getActiveDraft(sessionToken);
}

export async function updateStep1(sessionToken: string, input: AppointmentStep1) {
  await getActiveDraft(sessionToken);
  const data = appointmentStep1Schema.parse(input);
  return prisma.appointmentDraft.update({
    where: { sessionToken },
    data: {
      visitType: data.visitType,
      lastCompletedStep: { set: 1 },
      expiresAt: draftExpiryDate()
    }
  });
}

export async function updateStep2(sessionToken: string, input: AppointmentStep2) {
  await getActiveDraft(sessionToken);
  const data = appointmentStep2Schema.parse(input);
  return prisma.appointmentDraft.update({
    where: { sessionToken },
    data: {
      petName: data.petName,
      species: data.species,
      breed: data.breed,
      approximateAgeYears: data.approximateAgeYears,
      sex: data.sex,
      weightLbs: data.weightLbs ? new Prisma.Decimal(data.weightLbs) : undefined,
      lastCompletedStep: { set: 2 },
      expiresAt: draftExpiryDate()
    }
  });
}

export async function updateStep3(sessionToken: string, input: AppointmentStep3) {
  await getActiveDraft(sessionToken);
  const data = appointmentStep3Schema.parse(input);
  return prisma.appointmentDraft.update({
    where: { sessionToken },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      preferredContactMethod: data.preferredContactMethod,
      marketingEmailOptIn: data.marketingEmailOptIn,
      marketingSmsOptIn: data.marketingSmsOptIn,
      lastCompletedStep: { set: 3 },
      expiresAt: draftExpiryDate()
    }
  });
}

export async function updateStep4(sessionToken: string, input: AppointmentStep4) {
  await getActiveDraft(sessionToken);
  const data = appointmentStep4Schema.parse(input);
  return prisma.appointmentDraft.update({
    where: { sessionToken },
    data: {
      preferredSelections: data.preferredSelections,
      timezone: data.timezone,
      lastCompletedStep: { set: 4 },
      expiresAt: draftExpiryDate()
    }
  });
}

export async function updateStep5(sessionToken: string, input: AppointmentStep5) {
  await getActiveDraft(sessionToken);
  const data = appointmentStep5Schema.parse(input);
  return prisma.appointmentDraft.update({
    where: { sessionToken },
    data: {
      symptomsOrConcerns: data.symptomsOrConcerns,
      currentMedications: data.currentMedications,
      previousVeterinarian: data.previousVeterinarian,
      symptomDuration: data.symptomDuration,
      lastCompletedStep: { set: 5 },
      expiresAt: draftExpiryDate()
    }
  });
}

export async function submitAppointmentDraft(sessionToken: string) {
  const draft = await getActiveDraft(sessionToken);
  if (draft.submittedAt || draft.appointmentRequest) {
    throw new HttpError(409, "Appointment draft has already been submitted");
  }

  const fullDraft = fullAppointmentDraftSchema.parse({
    visitType: draft.visitType,
    petName: draft.petName,
    species: draft.species,
    breed: draft.breed,
    approximateAgeYears: draft.approximateAgeYears,
    sex: draft.sex,
    weightLbs: draft.weightLbs ? Number(draft.weightLbs) : undefined,
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email,
    phoneNumber: draft.phoneNumber,
    preferredContactMethod: draft.preferredContactMethod,
    marketingEmailOptIn: draft.marketingEmailOptIn,
    marketingSmsOptIn: draft.marketingSmsOptIn,
    preferredSelections: draft.preferredSelections,
    timezone: draft.timezone,
    symptomsOrConcerns: draft.symptomsOrConcerns,
    currentMedications: draft.currentMedications,
    previousVeterinarian: draft.previousVeterinarian,
    symptomDuration: draft.symptomDuration
  });

  const duplicate = await findDuplicateAppointmentCandidate({
    phoneNumber: fullDraft.phoneNumber,
    email: fullDraft.email ?? undefined,
    petName: fullDraft.petName
  });
  const preferredDateKeys = extractPreferredSelectionDateKeys(fullDraft.preferredSelections);

  const appointmentRequest = await prisma.$transaction(async (tx) => {
    const owner = await resolveOwner(tx, {
      firstName: fullDraft.firstName,
      lastName: fullDraft.lastName,
      email: fullDraft.email ?? undefined,
      phoneNumber: fullDraft.phoneNumber,
      preferredContactMethod: fullDraft.preferredContactMethod
    });

    const pet = await resolvePet(tx, owner.id, {
      petName: fullDraft.petName,
      species: fullDraft.species,
      breed: fullDraft.breed ?? undefined,
      approximateAgeYears: fullDraft.approximateAgeYears ?? undefined,
      sex: fullDraft.sex,
      weightLbs: fullDraft.weightLbs ?? undefined,
      currentMedications: fullDraft.currentMedications ?? undefined
    });

    if (fullDraft.marketingEmailOptIn || fullDraft.marketingSmsOptIn) {
      await recordMarketingConsent(tx, owner.id, {
        emailOptIn: fullDraft.marketingEmailOptIn,
        smsOptIn: fullDraft.marketingSmsOptIn,
        source: "appointment-form"
      });
    }

    const request = await tx.appointmentRequest.create({
      data: {
        ownerId: owner.id,
        petId: pet.id,
        visitType: fullDraft.visitType,
        preferredSelections: fullDraft.preferredSelections,
        timezone: fullDraft.timezone,
        symptomsOrConcerns: fullDraft.symptomsOrConcerns ?? undefined,
        currentMedications: fullDraft.currentMedications ?? undefined,
        previousVeterinarian: fullDraft.previousVeterinarian ?? undefined,
        symptomDuration: fullDraft.symptomDuration ?? undefined,
        possibleDuplicate: Boolean(duplicate),
        duplicateOfId: duplicate?.id,
        preferredDateSelections: {
          create: preferredDateKeys.map((dateKey) => ({
            dateKey
          }))
        }
      },
      include: {
        owner: true,
        pet: true,
        files: true
      }
    });

    await attachFilesToAppointmentRequest(tx, draft.id, request.id, draft.files.length);

    await tx.appointmentDraft.update({
      where: { id: draft.id },
      data: {
        submittedAt: new Date(),
        appointmentRequestId: request.id
      }
    });

    return request;
  }, { timeout: 20000 });

  dispatchBackgroundEmail({
    requestId: appointmentRequest.id,
    requestType: "appointment",
    notificationType: "clinic",
    task: () =>
      sendClinicAppointmentNotification({
        requestId: appointmentRequest.id,
        ownerName: `${appointmentRequest.owner.firstName} ${appointmentRequest.owner.lastName}`,
        petName: appointmentRequest.pet.name,
        phoneNumber: appointmentRequest.owner.phoneNumber,
        visitType: appointmentRequest.visitType
      })
  });

  dispatchBackgroundEmail({
    requestId: appointmentRequest.id,
    requestType: "appointment",
    notificationType: "client",
    task: () =>
      sendClientAppointmentConfirmation({
        email: appointmentRequest.owner.email ?? undefined,
        ownerName: appointmentRequest.owner.firstName,
        petName: appointmentRequest.pet.name
      })
  });

  return prisma.appointmentRequest.findUniqueOrThrow({
    where: { id: appointmentRequest.id },
    include: { owner: true, pet: true, files: true, draft: true }
  });
}

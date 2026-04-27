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

export async function createAppointmentDraft() {
  return prisma.appointmentDraft.create({
    data: {
      sessionToken: crypto.randomBytes(32).toString("hex"),
      expiresAt: draftExpiryDate()
    },
    include: { files: true }
  });
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
      preferredSlots: data.preferredSlots,
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
    preferredSlots: draft.preferredSlots,
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

  const appointmentRequest = await prisma.$transaction(async (tx) => {
    const owner = await tx.owner.create({
      data: {
        firstName: fullDraft.firstName,
        lastName: fullDraft.lastName,
        email: fullDraft.email ?? undefined,
        phoneNumber: fullDraft.phoneNumber,
        preferredContactMethod: fullDraft.preferredContactMethod
      }
    });

    const pet = await tx.pet.create({
      data: {
        ownerId: owner.id,
        name: fullDraft.petName,
        species: fullDraft.species,
        breed: fullDraft.breed ?? undefined,
        approximateAgeYears: fullDraft.approximateAgeYears ?? undefined,
        sex: fullDraft.sex,
        weightLbs: fullDraft.weightLbs ? new Prisma.Decimal(fullDraft.weightLbs) : undefined,
        currentMedications: fullDraft.currentMedications ?? undefined
      }
    });

    const request = await tx.appointmentRequest.create({
      data: {
        ownerId: owner.id,
        petId: pet.id,
        visitType: fullDraft.visitType,
        preferredSlots: fullDraft.preferredSlots,
        timezone: fullDraft.timezone,
        symptomsOrConcerns: fullDraft.symptomsOrConcerns ?? undefined,
        currentMedications: fullDraft.currentMedications ?? undefined,
        previousVeterinarian: fullDraft.previousVeterinarian ?? undefined,
        symptomDuration: fullDraft.symptomDuration ?? undefined,
        possibleDuplicate: Boolean(duplicate),
        duplicateOfId: duplicate?.id
      },
      include: {
        owner: true,
        pet: true,
        files: true
      }
    });

    await tx.appointmentDraft.update({
      where: { id: draft.id },
      data: {
        submittedAt: new Date(),
        appointmentRequestId: request.id
      }
    });

    return request;
  }, { timeout: 20000 });

  await attachFilesToAppointmentRequest(draft.id, appointmentRequest.id);

  await Promise.allSettled([
    sendClinicAppointmentNotification({
      requestId: appointmentRequest.id,
      ownerName: `${appointmentRequest.owner.firstName} ${appointmentRequest.owner.lastName}`,
      petName: appointmentRequest.pet.name,
      phoneNumber: appointmentRequest.owner.phoneNumber,
      visitType: appointmentRequest.visitType
    }),
    sendClientAppointmentConfirmation({
      email: appointmentRequest.owner.email ?? undefined,
      ownerName: appointmentRequest.owner.firstName,
      petName: appointmentRequest.pet.name
    })
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Appointment email notification failed", result.reason);
      }
    }
  });

  return prisma.appointmentRequest.findUniqueOrThrow({
    where: { id: appointmentRequest.id },
    include: { owner: true, pet: true, files: true, draft: true }
  });
}

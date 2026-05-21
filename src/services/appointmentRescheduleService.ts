import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";
import { submitAppointmentDraft } from "./appointmentDraftService";
import { cloneAppointmentRequestFilesToRequest } from "./fileService";
import { sendClientAppointmentRescheduleRequest } from "./mailService";
import { dispatchBackgroundEmail } from "./emailDispatchService";
import type { AppointmentStep4 } from "../validators/appointmentDraftSchemas";

const appointmentRescheduleTokenInclude = {
  appointmentRequest: {
    include: {
      owner: true,
      pet: true,
      files: true,
      replacementAppointmentRequest: true
    }
  },
  appointmentDraft: true
} satisfies Prisma.AppointmentRescheduleTokenInclude;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function websiteUrl(pathname: string) {
  return `${env.PUBLIC_WEBSITE_URL.replace(/\/+$/, "")}${pathname}`;
}

function coerceFutureDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Response deadline is invalid");
  }

  if (date <= new Date()) {
    throw new HttpError(400, "Response deadline must be in the future");
  }

  return date;
}

async function getActiveTokenRecord(token: string) {
  const record = await prisma.appointmentRescheduleToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: appointmentRescheduleTokenInclude
  });

  if (!record) {
    throw new HttpError(404, "Reschedule link is invalid");
  }

  if (record.usedAt) {
    throw new HttpError(409, "This reschedule link has already been used");
  }

  if (record.expiresAt <= new Date()) {
    throw new HttpError(410, "This reschedule link has expired");
  }

  if (record.appointmentRequest.replacementAppointmentRequestId) {
    throw new HttpError(409, "A replacement appointment has already been submitted");
  }

  if (record.appointmentRequest.status !== "OVERDUE") {
    throw new HttpError(409, "This appointment is no longer eligible for rescheduling");
  }

  return record;
}

export async function issueAppointmentRescheduleLink(input: {
  appointmentRequestId: string;
  responseDeadline: string;
  staffUserId: string;
}) {
  const responseDeadline = coerceFutureDate(input.responseDeadline);
  const appointmentRequest = await prisma.appointmentRequest.findUnique({
    where: { id: input.appointmentRequestId },
    include: {
      owner: true,
      pet: true,
      files: true,
      draft: true,
      replacementAppointmentRequest: true
    }
  });

  if (!appointmentRequest) {
    throw new HttpError(404, "Appointment request not found");
  }

  if (appointmentRequest.status !== "OVERDUE") {
    throw new HttpError(409, "Only overdue appointments can request a new date");
  }

  if (appointmentRequest.replacementAppointmentRequestId) {
    throw new HttpError(409, "This overdue appointment already has a replacement request");
  }

  if (!appointmentRequest.owner.email) {
    throw new HttpError(409, "This owner does not have an email address on file");
  }

  const rawToken = createSessionToken();
  const tokenHash = hashToken(rawToken);
  const sessionToken = createSessionToken();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.appointmentRescheduleToken.updateMany({
      where: {
        appointmentRequestId: appointmentRequest.id,
        usedAt: null,
        expiresAt: { gt: now }
      },
      data: {
        expiresAt: now
      }
    });

    const draft = await tx.appointmentDraft.create({
      data: {
        sessionToken,
        visitType: appointmentRequest.visitType,
        petName: appointmentRequest.pet.name,
        species: appointmentRequest.pet.species,
        breed: appointmentRequest.pet.breed,
        approximateAgeYears: appointmentRequest.pet.approximateAgeYears ?? undefined,
        sex: appointmentRequest.pet.sex,
        weightLbs: appointmentRequest.pet.weightLbs ?? undefined,
        firstName: appointmentRequest.owner.firstName,
        lastName: appointmentRequest.owner.lastName,
        email: appointmentRequest.owner.email,
        phoneNumber: appointmentRequest.owner.phoneNumber,
        preferredContactMethod: appointmentRequest.owner.preferredContactMethod ?? undefined,
        preferredSelections: appointmentRequest.preferredSelections as Prisma.InputJsonValue,
        timezone: appointmentRequest.timezone,
        symptomsOrConcerns: appointmentRequest.symptomsOrConcerns,
        currentMedications: appointmentRequest.currentMedications,
        previousVeterinarian: appointmentRequest.previousVeterinarian,
        symptomDuration: appointmentRequest.symptomDuration,
        lastCompletedStep: 5,
        expiresAt: responseDeadline
      }
    });

    await tx.appointmentRescheduleToken.create({
      data: {
        appointmentRequestId: appointmentRequest.id,
        appointmentDraftId: draft.id,
        tokenHash,
        expiresAt: responseDeadline,
        createdByStaffUserId: input.staffUserId
      }
    });

    await tx.appointmentRequest.update({
      where: { id: appointmentRequest.id },
      data: {
        rescheduleRequestedAt: now,
        rescheduleResponseDeadline: responseDeadline,
        rescheduleEmailSentAt: now,
        rescheduleTokenIssuedAt: now
      }
    });
  });

  dispatchBackgroundEmail({
    requestId: appointmentRequest.id,
    requestType: "appointment",
    notificationType: "client",
    task: () =>
      sendClientAppointmentRescheduleRequest({
        email: appointmentRequest.owner.email ?? undefined,
        ownerName: appointmentRequest.owner.firstName,
        petName: appointmentRequest.pet.name,
        responseDeadline,
        confirmedStartAt: appointmentRequest.confirmedStartAt,
        rescheduleUrl: websiteUrl(`/book-appointment/reschedule/${rawToken}`)
      })
  });

  return prisma.appointmentRequest.findUniqueOrThrow({
    where: { id: appointmentRequest.id },
    include: { owner: true, pet: true, files: true, draft: true }
  });
}

export async function getAppointmentRescheduleContext(token: string) {
  const record = await getActiveTokenRecord(token);

  return {
    token,
    responseDeadline: record.expiresAt.toISOString(),
    appointmentRequestId: record.appointmentRequest.id,
    petName: record.appointmentRequest.pet.name,
    ownerName: `${record.appointmentRequest.owner.firstName} ${record.appointmentRequest.owner.lastName}`.trim(),
    visitType: record.appointmentRequest.visitType,
    confirmedStartAt: record.appointmentRequest.confirmedStartAt?.toISOString() ?? null,
    timezone: record.appointmentDraft.timezone ?? record.appointmentRequest.timezone,
    preferredSelections: (record.appointmentDraft.preferredSelections ??
      record.appointmentRequest.preferredSelections) as AppointmentStep4["preferredSelections"]
  };
}

export async function submitAppointmentReschedule(token: string, input: AppointmentStep4) {
  const record = await getActiveTokenRecord(token);

  await prisma.appointmentDraft.update({
    where: { id: record.appointmentDraft.id },
    data: {
      preferredSelections: input.preferredSelections,
      timezone: input.timezone,
      lastCompletedStep: 5,
      expiresAt: record.expiresAt
    }
  });

  const createdRequest = await submitAppointmentDraft(record.appointmentDraft.sessionToken);

  await prisma.$transaction(async (tx) => {
    await tx.appointmentRequest.update({
      where: { id: createdRequest.id },
      data: {
        rescheduledFromAppointmentRequestId: record.appointmentRequest.id,
        possibleDuplicate:
          createdRequest.duplicateOfId === record.appointmentRequest.id ? false : createdRequest.possibleDuplicate,
        duplicateOfId:
          createdRequest.duplicateOfId === record.appointmentRequest.id ? null : createdRequest.duplicateOfId
      }
    });

    await cloneAppointmentRequestFilesToRequest(
      tx,
      record.appointmentRequest.id,
      createdRequest.id
    );

    await tx.appointmentRequest.update({
      where: { id: record.appointmentRequest.id },
      data: {
        replacementAppointmentRequestId: createdRequest.id
      }
    });

    await tx.appointmentRescheduleToken.update({
      where: { id: record.id },
      data: {
        usedAt: new Date()
      }
    });

    await tx.appointmentRescheduleToken.updateMany({
      where: {
        appointmentRequestId: record.appointmentRequest.id,
        id: { not: record.id },
        usedAt: null
      },
      data: {
        expiresAt: new Date()
      }
    });
  });

  return prisma.appointmentRequest.findUniqueOrThrow({
    where: { id: createdRequest.id },
    include: { owner: true, pet: true, files: true, draft: true }
  });
}

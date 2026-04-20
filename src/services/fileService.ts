import type { Express } from "express";
import { FileAttachmentStatus } from "@prisma/client";
import { prisma } from "../prisma/client";
import { env } from "../config/env";
import { storageProvider } from "../storage/localStorageProvider";
import { HttpError } from "../utils/httpError";

function unattachedFileExpiryDate() {
  return new Date(Date.now() + env.UNATTACHED_FILE_EXPIRY_HOURS * 60 * 60 * 1000);
}

export async function createUploadedFiles(files: Express.Multer.File[]) {
  if (files.length === 0) {
    throw new HttpError(400, "At least one file is required");
  }

  const created = [];
  for (const file of files) {
    const stored = await storageProvider.save(file);
    created.push(
      await prisma.uploadedFile.create({
        data: {
          ...stored,
          attachmentStatus: FileAttachmentStatus.UNATTACHED,
          expiresAt: unattachedFileExpiryDate()
        }
      })
    );
  }

  return created;
}

export async function attachFilesToDraft(fileIds: string[], appointmentDraftId: string, expiresAt: Date) {
  await prisma.uploadedFile.updateMany({
    where: { id: { in: fileIds }, appointmentDraftId: null, appointmentRequestId: null, newPatientRequestId: null },
    data: {
      appointmentDraftId,
      attachmentStatus: FileAttachmentStatus.ATTACHED_TO_DRAFT,
      expiresAt
    }
  });
}

export async function assertUnattachedFilesAvailable(fileIds: string[]) {
  if (fileIds.length === 0) return;

  const count = await prisma.uploadedFile.count({
    where: {
      id: { in: fileIds },
      appointmentDraftId: null,
      appointmentRequestId: null,
      newPatientRequestId: null,
      attachmentStatus: FileAttachmentStatus.UNATTACHED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    }
  });

  if (count !== fileIds.length) {
    throw new HttpError(409, "One or more uploaded files are expired, already attached, or not found");
  }
}

export async function attachFilesToAppointmentRequest(appointmentDraftId: string, appointmentRequestId: string) {
  await prisma.uploadedFile.updateMany({
    where: { appointmentDraftId },
    data: {
      appointmentDraftId: null,
      appointmentRequestId,
      attachmentStatus: FileAttachmentStatus.ATTACHED,
      expiresAt: null
    }
  });
}

export async function attachFilesToNewPatientRequest(fileIds: string[], newPatientRequestId: string) {
  if (fileIds.length === 0) return;

  const result = await prisma.uploadedFile.updateMany({
    where: {
      id: { in: fileIds },
      appointmentDraftId: null,
      appointmentRequestId: null,
      newPatientRequestId: null,
      attachmentStatus: FileAttachmentStatus.UNATTACHED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    data: {
      newPatientRequestId,
      attachmentStatus: FileAttachmentStatus.ATTACHED,
      expiresAt: null
    }
  });

  if (result.count !== fileIds.length) {
    throw new HttpError(409, "One or more uploaded files are expired, already attached, or not found");
  }
}

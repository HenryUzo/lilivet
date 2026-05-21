import type { Express } from "express";
import fs from "fs/promises";
import { FileAttachmentStatus, type Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { env } from "../config/env";
import { storageProvider } from "../storage/localStorageProvider";
import { HttpError } from "../utils/httpError";

type DbClient = Prisma.TransactionClient | typeof prisma;

function unattachedFileExpiryDate() {
  return new Date(Date.now() + env.UNATTACHED_FILE_EXPIRY_HOURS * 60 * 60 * 1000);
}

function detectFileMimeType(signature: Uint8Array) {
  if (
    signature.length >= 4 &&
    signature[0] === 0x25 &&
    signature[1] === 0x50 &&
    signature[2] === 0x44 &&
    signature[3] === 0x46
  ) {
    return "application/pdf";
  }

  if (
    signature.length >= 3 &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    signature.length >= 8 &&
    signature[0] === 0x89 &&
    signature[1] === 0x50 &&
    signature[2] === 0x4e &&
    signature[3] === 0x47 &&
    signature[4] === 0x0d &&
    signature[5] === 0x0a &&
    signature[6] === 0x1a &&
    signature[7] === 0x0a
  ) {
    return "image/png";
  }

  return null;
}

async function validateUploadedFileSignature(file: Express.Multer.File) {
  const handle = await fs.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const actualMimeType = detectFileMimeType(buffer.subarray(0, bytesRead));

    if (!actualMimeType || actualMimeType !== file.mimetype) {
      throw new HttpError(415, "Uploaded file contents do not match the declared file type");
    }
  } finally {
    await handle.close();
  }
}

async function cleanupTempFile(file: Express.Multer.File) {
  await fs.unlink(file.path).catch(() => undefined);
}

export async function createUploadedFiles(files: Express.Multer.File[]) {
  if (files.length === 0) {
    throw new HttpError(400, "At least one file is required");
  }

  try {
    for (const file of files) {
      await validateUploadedFileSignature(file);
    }
  } catch (error) {
    await Promise.allSettled(files.map((file) => cleanupTempFile(file)));
    throw error;
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
  if (fileIds.length === 0) return;

  const result = await prisma.uploadedFile.updateMany({
    where: { id: { in: fileIds }, appointmentDraftId: null, appointmentRequestId: null, newPatientRequestId: null },
    data: {
      appointmentDraftId,
      attachmentStatus: FileAttachmentStatus.ATTACHED_TO_DRAFT,
      expiresAt
    }
  });

  if (result.count !== fileIds.length) {
    throw new HttpError(409, "One or more uploaded files are expired, already attached, or not found");
  }
}

export async function assertUnattachedFilesAvailable(fileIds: string[], dbClient: DbClient = prisma) {
  if (fileIds.length === 0) return;

  const count = await dbClient.uploadedFile.count({
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

export async function attachFilesToAppointmentRequest(
  dbClient: DbClient,
  appointmentDraftId: string,
  appointmentRequestId: string,
  expectedCount?: number
) {
  const result = await dbClient.uploadedFile.updateMany({
    where: { appointmentDraftId },
    data: {
      appointmentDraftId: null,
      appointmentRequestId,
      attachmentStatus: FileAttachmentStatus.ATTACHED,
      expiresAt: null
    }
  });

  if (expectedCount !== undefined && result.count !== expectedCount) {
    throw new HttpError(409, "One or more draft files could not be attached to the appointment request");
  }
}

export async function attachFilesToNewPatientRequest(
  dbClient: DbClient,
  fileIds: string[],
  newPatientRequestId: string
) {
  if (fileIds.length === 0) return;

  const result = await dbClient.uploadedFile.updateMany({
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

export async function cloneAppointmentRequestFilesToRequest(
  dbClient: DbClient,
  sourceAppointmentRequestId: string,
  targetAppointmentRequestId: string
) {
  const sourceFiles = await dbClient.uploadedFile.findMany({
    where: { appointmentRequestId: sourceAppointmentRequestId }
  });

  if (sourceFiles.length === 0) {
    return;
  }

  await dbClient.uploadedFile.createMany({
    data: sourceFiles.map((file) => ({
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageProvider: file.storageProvider,
      storageKey: file.storageKey,
      publicUrl: file.publicUrl,
      attachmentStatus: FileAttachmentStatus.ATTACHED,
      expiresAt: null,
      appointmentRequestId: targetAppointmentRequestId
    }))
  });
}

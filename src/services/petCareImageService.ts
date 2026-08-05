import type { Express } from "express";
import { storageProvider } from "../storage";
import { cleanupTempFile, validateUploadedFileSignature } from "./fileService";
import { HttpError } from "../utils/httpError";

const supportedImageTypes = new Set(["image/jpeg", "image/png"]);

export async function savePetCareHeroImage(file: Express.Multer.File | undefined) {
  if (!file) {
    throw new HttpError(400, "Choose a JPG or PNG image to upload");
  }

  if (!supportedImageTypes.has(file.mimetype)) {
    await cleanupTempFile(file);
    throw new HttpError(415, "Pet Care hero images must be JPG or PNG files");
  }

  try {
    await validateUploadedFileSignature(file);
    const stored = await storageProvider.save(file);

    if (!stored.publicUrl) {
      throw new HttpError(503, "Public image delivery is not configured for the storage provider");
    }

    return {
      url: stored.publicUrl,
      storageKey: stored.storageKey,
      fileName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes
    };
  } catch (error) {
    await cleanupTempFile(file);
    throw error;
  }
}

import type { Express } from "express";
import crypto from "crypto";
import { storageProvider } from "../storage";
import { cleanupTempFile, validateUploadedFileSignature } from "./fileService";
import { HttpError } from "../utils/httpError";
import { petCareImageMimeTypes } from "../constants/files";
import { env } from "../config/env";

const supportedImageTypes = new Set<string>(petCareImageMimeTypes);

interface PublicImagePayload {
  key: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}

function signPayload(encodedPayload: string) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(encodedPayload).digest("base64url");
}

function createPublicImageToken(payload: PublicImagePayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function readPublicImageToken(token: string): PublicImagePayload {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) {
    throw new HttpError(404, "Image not found");
  }

  const expectedSignature = signPayload(encodedPayload);
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    throw new HttpError(404, "Image not found");
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PublicImagePayload;
    if (
      !payload.key ||
      !supportedImageTypes.has(payload.mimeType) ||
      !payload.fileName ||
      !Number.isFinite(payload.sizeBytes) ||
      payload.sizeBytes <= 0
    ) {
      throw new Error("Invalid image payload");
    }
    return payload;
  } catch {
    throw new HttpError(404, "Image not found");
  }
}

function buildApiImageUrl(apiBaseUrl: string, stored: PublicImagePayload) {
  const token = createPublicImageToken(stored);
  return `${apiBaseUrl.replace(/\/+$/, "")}/api/pet-care/images/${token}`;
}

export async function savePetCareHeroImage(file: Express.Multer.File | undefined, apiBaseUrl: string) {
  if (!file) {
    throw new HttpError(400, "Choose an image to upload");
  }

  if (!supportedImageTypes.has(file.mimetype)) {
    await cleanupTempFile(file);
    throw new HttpError(415, "Upload a JPEG, PNG, WebP, GIF, AVIF, or BMP image");
  }

  try {
    await validateUploadedFileSignature(file);
    const stored = await storageProvider.save(file);

    const url = stored.publicUrl ?? buildApiImageUrl(apiBaseUrl, {
      key: stored.storageKey,
      mimeType: stored.mimeType,
      fileName: stored.originalName,
      sizeBytes: stored.sizeBytes
    });

    return {
      url,
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

export async function openPublicPetCareImage(token: string) {
  const payload = readPublicImageToken(token);
  const target = await storageProvider.open({
    originalName: payload.fileName,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    storageProvider: storageProvider.name,
    storageKey: payload.key
  });

  return { payload, target };
}

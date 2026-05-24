import fs from "fs/promises";
import path from "path";
import { prisma } from "../prisma/client";
import { HttpError } from "../utils/httpError";

export async function getStaffFileAccess(id: string) {
  const file = await prisma.uploadedFile.findUnique({
    where: { id }
  });

  if (!file || (!file.appointmentRequestId && !file.newPatientRequestId)) {
    throw new HttpError(404, "File not found");
  }

  if (file.storageProvider !== "local") {
    throw new HttpError(501, "Storage provider is not supported for direct staff file access");
  }

  const absolutePath = path.resolve(file.storageKey);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new HttpError(410, "File is no longer available on the server");
  }

  return {
    file,
    absolutePath
  };
}

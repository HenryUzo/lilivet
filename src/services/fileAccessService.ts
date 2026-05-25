import { prisma } from "../prisma/client";
import { getStorageProvider } from "../storage";
import { HttpError } from "../utils/httpError";

export async function getStaffFileAccess(id: string) {
  const file = await prisma.uploadedFile.findUnique({
    where: { id }
  });

  if (!file || (!file.appointmentRequestId && !file.newPatientRequestId)) {
    throw new HttpError(404, "File not found");
  }

  const provider = getStorageProvider(file.storageProvider);
  const target = await provider.open(file);

  return {
    file,
    target
  };
}

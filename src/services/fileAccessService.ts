import { StaffPermissionKey } from "@prisma/client";
import { prisma } from "../prisma/client";
import { getStorageProvider } from "../storage";
import { HttpError } from "../utils/httpError";

export async function getStaffFileAccess(id: string, permissions: StaffPermissionKey[]) {
  const file = await prisma.uploadedFile.findUnique({
    where: { id }
  });

  if (!file || (!file.appointmentRequestId && !file.newPatientRequestId)) {
    throw new HttpError(404, "File not found");
  }

  const canAccessAppointmentFiles = permissions.includes(StaffPermissionKey.APPOINTMENTS_VIEW);
  const canAccessNewPatientFiles = permissions.includes(StaffPermissionKey.NEW_PATIENTS_VIEW);
  if ((file.appointmentRequestId && !canAccessAppointmentFiles) || (file.newPatientRequestId && !canAccessNewPatientFiles)) {
    throw new HttpError(403, "Staff user is not allowed to access this file");
  }

  const provider = getStorageProvider(file.storageProvider);
  const target = await provider.open(file);

  return {
    file,
    target
  };
}

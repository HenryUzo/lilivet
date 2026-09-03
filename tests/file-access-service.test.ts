import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffPermissionKey } from "@prisma/client";

const { uploadedFileFindUniqueMock, getStorageProviderMock, providerOpenMock } = vi.hoisted(() => ({
  uploadedFileFindUniqueMock: vi.fn(),
  getStorageProviderMock: vi.fn(),
  providerOpenMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    uploadedFile: {
      findUnique: uploadedFileFindUniqueMock
    }
  }
}));

vi.mock("../src/storage", () => ({
  getStorageProvider: getStorageProviderMock
}));

import { getStaffFileAccess } from "../src/services/fileAccessService";

describe("getStaffFileAccess", () => {
  beforeEach(() => {
    uploadedFileFindUniqueMock.mockReset();
    getStorageProviderMock.mockReset();
    providerOpenMock.mockReset();
    getStorageProviderMock.mockReturnValue({
      open: providerOpenMock
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a storage target for attached request files", async () => {
    const fileRecord = {
      id: "file-1",
      originalName: "record.pdf",
      sizeBytes: 512,
      mimeType: "application/pdf",
      storageProvider: "local",
      storageKey: "/tmp/record.pdf",
      appointmentRequestId: "appointment-1",
      newPatientRequestId: null
    };
    const storageTarget = {
      kind: "local" as const,
      absolutePath: "C:/tmp/record.pdf"
    };

    uploadedFileFindUniqueMock.mockResolvedValue(fileRecord);
    providerOpenMock.mockResolvedValue(storageTarget);

    const result = await getStaffFileAccess("file-1", [StaffPermissionKey.APPOINTMENTS_VIEW]);

    expect(result.file.id).toBe("file-1");
    expect(getStorageProviderMock).toHaveBeenCalledWith("local");
    expect(providerOpenMock).toHaveBeenCalledWith(fileRecord);
    expect(result.target).toEqual(storageTarget);
  });

  it("rejects files that are not attached to a submitted request", async () => {
    uploadedFileFindUniqueMock.mockResolvedValue({
      id: "file-1",
      originalName: "record.pdf",
      sizeBytes: 512,
      mimeType: "application/pdf",
      storageProvider: "local",
      storageKey: "/tmp/record.pdf",
      appointmentRequestId: null,
      newPatientRequestId: null
    });

    await expect(getStaffFileAccess("file-1", [StaffPermissionKey.APPOINTMENTS_VIEW])).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("propagates provider access failures", async () => {
    uploadedFileFindUniqueMock.mockResolvedValue({
      id: "file-1",
      originalName: "record.pdf",
      sizeBytes: 512,
      mimeType: "application/pdf",
      storageProvider: "s3",
      storageKey: "uploads/record.pdf",
      appointmentRequestId: null,
      newPatientRequestId: "new-patient-1"
    });
    providerOpenMock.mockRejectedValue({
      statusCode: 410,
      message: "File is no longer available on the server"
    });

    await expect(getStaffFileAccess("file-1", [StaffPermissionKey.NEW_PATIENTS_VIEW])).rejects.toMatchObject({
      statusCode: 410
    });
  });

  it("rejects a staff user without the workflow permission", async () => {
    uploadedFileFindUniqueMock.mockResolvedValue({
      id: "file-1", originalName: "record.pdf", sizeBytes: 512, mimeType: "application/pdf", storageProvider: "local", storageKey: "/tmp/record.pdf", appointmentRequestId: "appointment-1", newPatientRequestId: null
    });

    await expect(getStaffFileAccess("file-1", [StaffPermissionKey.NEW_PATIENTS_VIEW])).rejects.toMatchObject({
      statusCode: 403
    });
    expect(providerOpenMock).not.toHaveBeenCalled();
  });
});

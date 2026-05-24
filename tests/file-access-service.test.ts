import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { uploadedFileFindUniqueMock } = vi.hoisted(() => ({
  uploadedFileFindUniqueMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    uploadedFile: {
      findUnique: uploadedFileFindUniqueMock
    }
  }
}));

import { getStaffFileAccess } from "../src/services/fileAccessService";

describe("getStaffFileAccess", () => {
  let tempFilePath: string;

  beforeEach(async () => {
    uploadedFileFindUniqueMock.mockReset();
    tempFilePath = path.join(os.tmpdir(), `lili-vet-staff-file-${Date.now()}.pdf`);
    await fs.writeFile(tempFilePath, Buffer.from("pdf"));
  });

  afterEach(async () => {
    await fs.unlink(tempFilePath).catch(() => undefined);
  });

  it("returns the local file path for attached request files", async () => {
    uploadedFileFindUniqueMock.mockResolvedValue({
      id: "file-1",
      originalName: "record.pdf",
      mimeType: "application/pdf",
      storageProvider: "local",
      storageKey: tempFilePath,
      appointmentRequestId: "appointment-1",
      newPatientRequestId: null
    });

    const result = await getStaffFileAccess("file-1");

    expect(result.file.id).toBe("file-1");
    expect(result.absolutePath).toBe(path.resolve(tempFilePath));
  });

  it("rejects files that are not attached to a submitted request", async () => {
    uploadedFileFindUniqueMock.mockResolvedValue({
      id: "file-1",
      originalName: "record.pdf",
      mimeType: "application/pdf",
      storageProvider: "local",
      storageKey: tempFilePath,
      appointmentRequestId: null,
      newPatientRequestId: null
    });

    await expect(getStaffFileAccess("file-1")).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("rejects missing files on disk", async () => {
    uploadedFileFindUniqueMock.mockResolvedValue({
      id: "file-1",
      originalName: "record.pdf",
      mimeType: "application/pdf",
      storageProvider: "local",
      storageKey: `${tempFilePath}.missing`,
      appointmentRequestId: null,
      newPatientRequestId: "new-patient-1"
    });

    await expect(getStaffFileAccess("file-1")).rejects.toMatchObject({
      statusCode: 410
    });
  });
});

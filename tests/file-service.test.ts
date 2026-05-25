import fs from "fs/promises";
import os from "os";
import path from "path";
import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { uploadedFileCreateMock, storageSaveMock } = vi.hoisted(() => ({
  uploadedFileCreateMock: vi.fn(),
  storageSaveMock: vi.fn()
}));

vi.mock("../src/prisma/client", () => ({
  prisma: {
    uploadedFile: {
      create: uploadedFileCreateMock
    }
  }
}));

vi.mock("../src/storage", () => ({
  storageProvider: {
    save: storageSaveMock
  }
}));

import { createUploadedFiles } from "../src/services/fileService";

describe("createUploadedFiles", () => {
  let tempFilePath: string;

  beforeEach(async () => {
    uploadedFileCreateMock.mockReset();
    storageSaveMock.mockReset();
    tempFilePath = path.join(os.tmpdir(), `lili-vet-upload-${Date.now()}.bin`);
    await fs.writeFile(tempFilePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  afterEach(async () => {
    await fs.unlink(tempFilePath).catch(() => undefined);
  });

  it("rejects spoofed uploads when the magic bytes do not match the declared MIME type", async () => {
    await expect(createUploadedFiles([
      {
        originalname: "spoofed.pdf",
        mimetype: "application/pdf",
        size: 8,
        path: tempFilePath
      } as Express.Multer.File
    ])).rejects.toMatchObject({
      statusCode: 415
    });

    expect(storageSaveMock).not.toHaveBeenCalled();
    await expect(fs.access(tempFilePath)).rejects.toBeDefined();
  });
});

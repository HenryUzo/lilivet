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

import { createUploadedFiles, validateUploadedFileSignature } from "../src/services/fileService";

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

  it.each([
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
    ["image/gif", [...Buffer.from("GIF89a")]],
    ["image/avif", [0, 0, 0, 0x18, ...Buffer.from("ftypavif")]],
    ["image/bmp", [0x42, 0x4d, 0, 0]]
  ])("accepts a valid %s signature", async (mimeType, bytes) => {
    await fs.writeFile(tempFilePath, Buffer.from(bytes as number[]));
    await expect(validateUploadedFileSignature({
      originalname: "image",
      mimetype: mimeType,
      size: bytes.length,
      path: tempFilePath
    } as Express.Multer.File)).resolves.toBeUndefined();
  });
});

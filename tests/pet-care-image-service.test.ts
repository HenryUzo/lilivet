import { beforeEach, describe, expect, it, vi } from "vitest";

const { save, cleanupTempFile, validateUploadedFileSignature } = vi.hoisted(() => ({
  save: vi.fn(),
  cleanupTempFile: vi.fn(),
  validateUploadedFileSignature: vi.fn()
}));

vi.mock("../src/storage", () => ({ storageProvider: { save } }));
vi.mock("../src/services/fileService", () => ({ cleanupTempFile, validateUploadedFileSignature }));

import { savePetCareHeroImage } from "../src/services/petCareImageService";

function uploadedFile(mimetype = "image/png") {
  return {
    mimetype,
    originalname: "hero.png",
    path: "C:/temp/hero.png",
    size: 1024
  } as Express.Multer.File;
}

describe("Pet Care hero image uploads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an image", async () => {
    await expect(savePetCareHeroImage(undefined)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects non-image uploads and cleans up the temporary file", async () => {
    const file = uploadedFile("application/pdf");
    await expect(savePetCareHeroImage(file)).rejects.toMatchObject({ statusCode: 415 });
    expect(cleanupTempFile).toHaveBeenCalledWith(file);
    expect(save).not.toHaveBeenCalled();
  });

  it("validates and stores a public image", async () => {
    const file = uploadedFile();
    save.mockResolvedValue({
      originalName: "hero.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      storageKey: "uploads/hero.png",
      publicUrl: "https://media.example.com/uploads/hero.png"
    });

    await expect(savePetCareHeroImage(file)).resolves.toEqual({
      url: "https://media.example.com/uploads/hero.png",
      storageKey: "uploads/hero.png",
      fileName: "hero.png",
      mimeType: "image/png",
      sizeBytes: 1024
    });
    expect(validateUploadedFileSignature).toHaveBeenCalledWith(file);
    expect(save).toHaveBeenCalledWith(file);
  });
});

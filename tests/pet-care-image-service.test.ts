import { beforeEach, describe, expect, it, vi } from "vitest";

const { save, open, cleanupTempFile, validateUploadedFileSignature } = vi.hoisted(() => ({
  save: vi.fn(),
  open: vi.fn(),
  cleanupTempFile: vi.fn(),
  validateUploadedFileSignature: vi.fn()
}));

vi.mock("../src/storage", () => ({ storageProvider: { name: "s3", save, open } }));
vi.mock("../src/services/fileService", () => ({ cleanupTempFile, validateUploadedFileSignature }));

import { openPublicPetCareImage, savePetCareHeroImage } from "../src/services/petCareImageService";

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
    await expect(savePetCareHeroImage(undefined, "https://api.example.com")).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects non-image uploads and cleans up the temporary file", async () => {
    const file = uploadedFile("application/pdf");
    await expect(savePetCareHeroImage(file, "https://api.example.com")).rejects.toMatchObject({ statusCode: 415 });
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

    await expect(savePetCareHeroImage(file, "https://api.example.com")).resolves.toEqual({
      url: "https://media.example.com/uploads/hero.png",
      storageKey: "uploads/hero.png",
      fileName: "hero.png",
      mimeType: "image/png",
      sizeBytes: 1024
    });
    expect(validateUploadedFileSignature).toHaveBeenCalledWith(file);
    expect(save).toHaveBeenCalledWith(file);
  });

  it("creates a signed API delivery URL when the bucket has no public base URL", async () => {
    const file = uploadedFile();
    save.mockResolvedValue({
      originalName: "hero.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      storageKey: "uploads/hero.png"
    });

    const result = await savePetCareHeroImage(file, "https://api.example.com/");
    expect(result.url).toMatch(/^https:\/\/api\.example\.com\/api\/pet-care\/images\/[^/]+$/);

    const token = result.url.split("/").at(-1)!;
    open.mockResolvedValue({ kind: "stream", stream: {}, sizeBytes: 1024 });
    await expect(openPublicPetCareImage(token)).resolves.toMatchObject({
      payload: { key: "uploads/hero.png", mimeType: "image/png", fileName: "hero.png", sizeBytes: 1024 }
    });
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ storageKey: "uploads/hero.png" }));
  });

  it("rejects a modified public image token", async () => {
    await expect(openPublicPetCareImage("invalid.token")).rejects.toMatchObject({ statusCode: 404 });
    expect(open).not.toHaveBeenCalled();
  });
});

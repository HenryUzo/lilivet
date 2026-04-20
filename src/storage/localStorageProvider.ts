import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { Express } from "express";
import { env } from "../config/env";
import type { StorageProvider, StoredFile } from "./storageProvider";

const extensionByMimeType: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png"
};

export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;

  constructor(uploadDir = env.UPLOAD_DIR) {
    this.uploadDir = path.resolve(uploadDir);
  }

  async save(file: Express.Multer.File): Promise<StoredFile> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const storedName = `${crypto.randomUUID()}${extensionByMimeType[file.mimetype] ?? ""}`;
    const storageKey = path.join(this.uploadDir, storedName);
    await fs.rename(file.path, storageKey);

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageProvider: "local",
      storageKey
    };
  }
}

export const storageProvider = new LocalStorageProvider();

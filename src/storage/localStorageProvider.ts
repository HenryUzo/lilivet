import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
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
  private readonly fallbackUploadDir: string;

  constructor(uploadDir = env.UPLOAD_DIR) {
    this.uploadDir = path.resolve(uploadDir);
    this.fallbackUploadDir = path.join(os.tmpdir(), "lilivet-uploads");
  }

  async save(file: Express.Multer.File): Promise<StoredFile> {
    const storedName = `${crypto.randomUUID()}${extensionByMimeType[file.mimetype] ?? ""}`;
    const storageKey = await this.moveToUploadDir(file.path, storedName);

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageProvider: "local",
      storageKey
    };
  }

  private async moveToUploadDir(tempPath: string, storedName: string) {
    try {
      return await this.moveFile(tempPath, this.uploadDir, storedName);
    } catch (error) {
      if (this.uploadDir === this.fallbackUploadDir) {
        throw error;
      }

      console.error("Configured upload directory failed; falling back to OS temp storage", {
        uploadDir: this.uploadDir,
        fallbackUploadDir: this.fallbackUploadDir,
        error
      });
      return this.moveFile(tempPath, this.fallbackUploadDir, storedName);
    }
  }

  private async moveFile(tempPath: string, uploadDir: string, storedName: string) {
    await fs.mkdir(uploadDir, { recursive: true });
    const storageKey = path.join(uploadDir, storedName);

    try {
      await fs.rename(tempPath, storageKey);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
        throw error;
      }
      await fs.copyFile(tempPath, storageKey);
      await fs.unlink(tempPath);
    }

    return storageKey;
  }
}

export const storageProvider = new LocalStorageProvider();

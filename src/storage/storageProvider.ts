import type { Express } from "express";

export interface StoredFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  storageKey: string;
  publicUrl?: string;
}

export interface StorageProvider {
  save(file: Express.Multer.File): Promise<StoredFile>;
}

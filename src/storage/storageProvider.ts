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

export interface StoredFileRecord {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  storageKey: string;
  publicUrl?: string | null;
}

export type StorageReadTarget =
  | {
      kind: "local";
      absolutePath: string;
    }
  | {
      kind: "stream";
      stream: NodeJS.ReadableStream;
      sizeBytes?: number;
    };

export interface StorageProvider {
  readonly name: string;
  save(file: Express.Multer.File): Promise<StoredFile>;
  open(file: StoredFileRecord): Promise<StorageReadTarget>;
}

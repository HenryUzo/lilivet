import { createReadStream } from "fs";
import fs from "fs/promises";
import type { Express } from "express";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";
import { createStoredFileName } from "./storageNaming";
import type { StorageProvider, StoredFile, StoredFileRecord } from "./storageProvider";

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function buildObjectKey(storedName: string) {
  const prefix = trimSlashes(env.S3_KEY_PREFIX);
  return prefix ? `${prefix}/${storedName}` : storedName;
}

function buildPublicUrl(key: string) {
  if (!env.S3_PUBLIC_BASE_URL) {
    return undefined;
  }

  const base = env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/${encodedKey}`;
}

function toNodeStream(body: unknown): NodeJS.ReadableStream {
  if (body && typeof body === "object" && "pipe" in body && typeof body.pipe === "function") {
    return body as NodeJS.ReadableStream;
  }

  throw new HttpError(502, "Stored file could not be streamed from object storage");
}

export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 storage is selected but S3 credentials or bucket configuration are missing");
    }

    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      }
    });
  }

  async save(file: Express.Multer.File): Promise<StoredFile> {
    const storedName = createStoredFileName(file.mimetype);
    const storageKey = buildObjectKey(storedName);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: createReadStream(file.path),
          ContentType: file.mimetype
        })
      );
    } finally {
      await fs.unlink(file.path).catch(() => undefined);
    }

    return {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageProvider: this.name,
      storageKey,
      publicUrl: buildPublicUrl(storageKey)
    };
  }

  async open(file: StoredFileRecord) {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: file.storageKey
        })
      );

      return {
        kind: "stream" as const,
        stream: toNodeStream(response.Body),
        sizeBytes: response.ContentLength ? Number(response.ContentLength) : file.sizeBytes
      };
    } catch (error) {
      const errorName = (error as { name?: string }).name;

      if (errorName === "NoSuchKey" || errorName === "NotFound") {
        throw new HttpError(410, "File is no longer available on the server");
      }

      throw new HttpError(502, "Could not access stored file");
    }
  }
}

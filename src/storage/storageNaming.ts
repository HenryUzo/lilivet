import crypto from "crypto";

const extensionByMimeType: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp"
};

export function createStoredFileName(mimeType: string) {
  return `${crypto.randomUUID()}${extensionByMimeType[mimeType] ?? ""}`;
}

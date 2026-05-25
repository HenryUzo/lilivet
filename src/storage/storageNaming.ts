import crypto from "crypto";

const extensionByMimeType: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png"
};

export function createStoredFileName(mimeType: string) {
  return `${crypto.randomUUID()}${extensionByMimeType[mimeType] ?? ""}`;
}


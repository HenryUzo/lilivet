import { env } from "../config/env";
import { HttpError } from "../utils/httpError";
import { LocalStorageProvider } from "./localStorageProvider";
import { S3StorageProvider } from "./s3StorageProvider";
import type { StorageProvider } from "./storageProvider";

const providerFactories: Record<string, () => StorageProvider> = {
  local: () => new LocalStorageProvider(),
  s3: () => new S3StorageProvider()
};

const providerCache = new Map<string, StorageProvider>();

export function getStorageProvider(name: string) {
  const existing = providerCache.get(name);
  if (existing) {
    return existing;
  }

  const createProvider = providerFactories[name];
  if (!createProvider) {
    throw new HttpError(501, `Storage provider '${name}' is not supported`);
  }

  const provider = createProvider();
  providerCache.set(name, provider);
  return provider;
}

export const storageProvider = getStorageProvider(env.STORAGE_PROVIDER);

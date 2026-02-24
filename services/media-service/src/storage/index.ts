import { StorageAdapter } from "./adapter.interface";
import { LocalStorageAdapter } from "./local.adapter";
import { S3StorageAdapter } from "./s3.adapter";
import { getStorageConfig } from "../config/storage";
import { logger } from "../config/logger";

let storageAdapter: StorageAdapter | null = null;

/**
 * Get the storage adapter singleton.
 * Adapter type is determined by STORAGE_ADAPTER env var.
 * - "local" → LocalStorageAdapter (VPS disk)
 * - "s3"    → S3StorageAdapter (AWS S3 / Cloudflare R2)
 *
 * Switch by changing env vars only — zero code changes.
 */
export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    const config = getStorageConfig();

    if (config.adapter === "s3" && config.s3) {
      storageAdapter = new S3StorageAdapter(config.s3);
      logger.info("Using S3 storage adapter");
    } else {
      const baseUrl = process.env.MEDIA_PUBLIC_URL || "/api/v1/media/files";
      storageAdapter = new LocalStorageAdapter(config.localPath, baseUrl);
      logger.info({ path: config.localPath }, "Using local storage adapter");
    }
  }

  return storageAdapter;
}

export { StorageAdapter } from "./adapter.interface";

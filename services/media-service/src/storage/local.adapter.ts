import fs from "fs/promises";
import path from "path";
import { StorageAdapter } from "./adapter.interface";
import { logger } from "../config/logger";

/**
 * Local filesystem storage adapter.
 * Stores files on the server's disk.
 * Used for development and initial production on VPS.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string, baseUrl?: string) {
    this.basePath = path.resolve(basePath);
    this.baseUrl = baseUrl || `/api/v1/media/files`;

    // Ensure base directory exists
    fs.mkdir(this.basePath, { recursive: true }).catch((err) => {
      logger.error(
        { err, path: this.basePath },
        "Failed to create storage directory",
      );
    });
  }

  async upload(
    storagePath: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<string> {
    const fullPath = path.join(this.basePath, storagePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);
    logger.info(
      { path: storagePath, size: buffer.length },
      "File saved to local storage",
    );

    return this.getPublicUrl(storagePath);
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, storagePath);
    return fs.readFile(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    try {
      await fs.unlink(fullPath);
      logger.info({ path: storagePath }, "File deleted from local storage");
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
      // File already doesn't exist — that's fine
    }
  }

  async deleteMany(storagePaths: string[]): Promise<void> {
    await Promise.all(storagePaths.map((p) => this.delete(p)));
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, storagePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(storagePath: string): string {
    // Normalize path separators for URLs
    const normalized = storagePath.replace(/\\/g, "/");
    return `${this.baseUrl}/${normalized}`;
  }
}

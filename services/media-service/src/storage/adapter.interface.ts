/**
 * Storage Adapter Interface
 * Abstracts file storage operations so we can swap backends via env config.
 * - Local: files on VPS disk
 * - S3: AWS S3 or Cloudflare R2 (same API)
 */
export interface StorageAdapter {
    /**
     * Upload a file to storage
     * @param storagePath - Path within the bucket (e.g., "avatars/tenant-id/file.webp")
     * @param buffer - File contents
     * @param mimeType - MIME type of the file
     * @returns Public URL or storage path
     */
    upload(storagePath: string, buffer: Buffer, mimeType: string): Promise<string>;

    /**
     * Download a file from storage
     * @param storagePath - Path to the file
     * @returns File contents as Buffer
     */
    download(storagePath: string): Promise<Buffer>;

    /**
     * Delete a file from storage
     * @param storagePath - Path to the file
     */
    delete(storagePath: string): Promise<void>;

    /**
     * Delete multiple files from storage
     * @param storagePaths - Array of paths to delete
     */
    deleteMany(storagePaths: string[]): Promise<void>;

    /**
     * Check if a file exists in storage
     * @param storagePath - Path to check
     */
    exists(storagePath: string): Promise<boolean>;

    /**
     * Get the public URL for a file
     * @param storagePath - Path to the file
     */
    getPublicUrl(storagePath: string): string;
}

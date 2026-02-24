import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { Prisma } from "../generated/prisma";
import { getStorageAdapter } from "../storage";
import { ImageProcessor } from "../processors/image.processor";
import { FileRepository, VariantRepository } from "../repositories/file.repository";
import { BUCKETS, IMAGE_VARIANTS, BucketName, getStorageConfig } from "../config/storage";
import {
  InvalidFileTypeError,
  FileTooLargeError,
  InvalidBucketError,
  StorageError,
} from "../errors/media.errors";
import { logger } from "../config/logger";

const fileRepo = new FileRepository();
const variantRepo = new VariantRepository();
const imageProcessor = new ImageProcessor();

/**
 * Determine file category from MIME type
 */
function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("msword"))
    return "document";
  if (mimeType.includes("zip") || mimeType.includes("gzip") || mimeType.includes("tar"))
    return "archive";
  return "other";
}

/**
 * Generate SHA-256 checksum of a buffer
 */
function generateChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export interface UploadResult {
  id: string;
  bucket: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  category: string;
  size: number;
  status: string;
  visibility: string;
  publicUrl: string | null;
  variants: Array<{
    name: string;
    publicUrl: string | null;
    width: number | null;
    height: number | null;
    size: number;
  }>;
  createdAt: Date;
}

/**
 * Handle file upload: validate, process images, store, save metadata
 */
export async function uploadFile(
  file: Express.Multer.File,
  tenantId: string,
  userId: string,
  bucket: string = "general",
  options: {
    visibility?: "public" | "private" | "authenticated";
    metadata?: Record<string, unknown>;
  } = {},
): Promise<UploadResult> {
  // 1. Validate bucket
  const bucketConfig = BUCKETS[bucket as BucketName];
  if (!bucketConfig) {
    throw new InvalidBucketError(bucket);
  }

  // 2. Validate file type
  const storageConfig = getStorageConfig();
  if (!storageConfig.allowedMimeTypes.includes(file.mimetype)) {
    throw new InvalidFileTypeError(file.mimetype);
  }

  // 3. Validate file size
  if (file.size > bucketConfig.maxSize) {
    throw new FileTooLargeError(file.size, bucketConfig.maxSize);
  }

  const fileId = uuid();
  const category = getFileCategory(file.mimetype);
  const checksum = generateChecksum(file.buffer);
  const isImage = ImageProcessor.isImage(file.mimetype);
  const storage = getStorageAdapter();

  // 4. Determine storage path
  // Format: bucket/tenantId/fileId.ext
  const ext = isImage ? "webp" : file.originalname.split(".").pop() || "bin";
  const storagePath = `${bucket}/${tenantId}/${fileId}.${ext}`;

  try {
    let processedBuffer = file.buffer;
    let processedMimeType = file.mimetype;
    let processedSize = file.size;

    // 5. Process image (convert to WebP, optimize)
    if (isImage) {
      const processed = await imageProcessor.processOriginal(file.buffer);
      processedBuffer = processed.buffer;
      processedMimeType = "image/webp";
      processedSize = processed.size;
    }

    // 6. Upload original to storage
    const publicUrl = await storage.upload(storagePath, processedBuffer, processedMimeType);

    // 7. Save file metadata to database
    const visibility = options.visibility || bucketConfig.visibility;
    const dbFile = await fileRepo.create({
      id: fileId,
      tenantId,
      userId,
      bucket,
      storagePath,
      filename: `${fileId}.${ext}`,
      originalFilename: file.originalname,
      mimeType: processedMimeType,
      category: category as any,
      size: BigInt(processedSize),
      checksum,
      status: "uploaded",
      visibility: visibility as any,
      metadata: (options.metadata || {}) as Prisma.InputJsonValue,
      publicUrl,
      uploadedAt: new Date(),
    });

    // 8. Generate and upload image variants
    const variantResults: Array<{
      name: string;
      publicUrl: string | null;
      width: number | null;
      height: number | null;
      size: number;
    }> = [];

    if (isImage && bucketConfig.generateVariants) {
      const variants = await imageProcessor.generateVariants(file.buffer, IMAGE_VARIANTS);

      for (const variant of variants) {
        const variantPath = `${bucket}/${tenantId}/${fileId}_${variant.name}.webp`;
        const variantUrl = await storage.upload(variantPath, variant.buffer, variant.mimeType);

        variantResults.push({
          name: variant.name,
          publicUrl: variantUrl,
          width: variant.width,
          height: variant.height,
          size: variant.size,
        });
      }

      // Save variant metadata to database
      if (variantResults.length > 0) {
        await variantRepo.createMany(
          fileId,
          variants.map((v) => ({
            id: uuid(),
            name: v.name,
            storagePath: `${bucket}/${tenantId}/${fileId}_${v.name}.webp`,
            mimeType: v.mimeType,
            size: BigInt(v.size),
            width: v.width,
            height: v.height,
            quality: IMAGE_VARIANTS.find((iv) => iv.name === v.name)?.quality,
            format: v.format,
            publicUrl: variantResults.find((vr) => vr.name === v.name)?.publicUrl,
          })),
        );
      }

      // Update status to ready
      await fileRepo.updateStatus(fileId, "ready", { processedAt: new Date() });
    } else {
      await fileRepo.updateStatus(fileId, "ready");
    }

    logger.info(
      {
        fileId,
        bucket,
        originalName: file.originalname,
        size: processedSize,
        variants: variantResults.length,
      },
      "File uploaded successfully",
    );

    return {
      id: fileId,
      bucket,
      filename: `${fileId}.${ext}`,
      originalFilename: file.originalname,
      mimeType: processedMimeType,
      category,
      size: processedSize,
      status: "ready",
      visibility,
      publicUrl,
      variants: variantResults,
      createdAt: dbFile.createdAt,
    };
  } catch (err: any) {
    // Cleanup on failure
    logger.error({ err, fileId }, "Upload failed, cleaning up");
    try {
      await storage.delete(storagePath);
    } catch {
      // Ignore cleanup errors
    }
    await fileRepo.updateStatus(fileId, "failed").catch(() => {});
    throw new StorageError(err.message);
  }
}

import { FileRepository } from "../repositories/file.repository";
import { getStorageAdapter } from "../storage";
import { FileNotFoundError, ForbiddenError } from "../errors/media.errors";
import { Prisma } from "../generated/prisma";
import { logger } from "../config/logger";

const fileRepo = new FileRepository();

/**
 * Get file by ID with tenant isolation
 */
export async function getFile(fileId: string, tenantId: string) {
  const file = await fileRepo.findById(fileId, tenantId);
  if (!file) {
    throw new FileNotFoundError(fileId);
  }
  return serializeFile(file);
}

/**
 * List files with pagination and filtering
 */
export async function listFiles(
  tenantId: string,
  options: {
    userId?: string;
    bucket?: string;
    category?: string;
    status?: string;
    page: number;
    limit: number;
  },
) {
  const result = await fileRepo.listByTenant(tenantId, options);
  return {
    files: result.files.map(serializeFile),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    },
  };
}

/**
 * Update file metadata/visibility
 */
export async function updateFile(
  fileId: string,
  tenantId: string,
  userId: string,
  data: { visibility?: string; metadata?: Record<string, unknown> },
) {
  const file = await fileRepo.findById(fileId, tenantId);
  if (!file) {
    throw new FileNotFoundError(fileId);
  }

  // Verify ownership (unless admin)
  if (file.userId !== userId) {
    throw new ForbiddenError("You can only update your own files");
  }

  await fileRepo.update(fileId, tenantId, {
    ...(data.visibility && { visibility: data.visibility as any }),
    ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
  });

  return getFile(fileId, tenantId);
}

/**
 * Delete file (soft delete in DB, actual delete from storage)
 */
export async function deleteFile(fileId: string, tenantId: string, userId: string) {
  const file = await fileRepo.findById(fileId, tenantId);
  if (!file) {
    throw new FileNotFoundError(fileId);
  }

  // Verify ownership
  if (file.userId !== userId) {
    throw new ForbiddenError("You can only delete your own files");
  }

  // Get all storage paths (original + variants)
  const storagePaths = await fileRepo.getStoragePaths(fileId, tenantId);

  // Delete from storage
  const storage = getStorageAdapter();
  try {
    await storage.deleteMany(storagePaths);
  } catch (err) {
    logger.warn({ err, fileId }, "Failed to delete from storage (will still soft-delete)");
  }

  // Soft delete in database
  await fileRepo.softDelete(fileId, tenantId);

  logger.info({ fileId, paths: storagePaths.length }, "File deleted");
}

/**
 * Serialize file for API response (convert BigInt to number)
 */
function serializeFile(file: any) {
  return {
    id: file.id,
    tenantId: file.tenantId,
    userId: file.userId,
    bucket: file.bucket,
    filename: file.filename,
    originalFilename: file.originalFilename,
    mimeType: file.mimeType,
    category: file.category,
    size: Number(file.size),
    status: file.status,
    visibility: file.visibility,
    publicUrl: file.publicUrl,
    metadata: file.metadata,
    uploadedAt: file.uploadedAt,
    processedAt: file.processedAt,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    variants:
      file.variants?.map((v: any) => ({
        id: v.id,
        name: v.name,
        mimeType: v.mimeType,
        size: Number(v.size),
        width: v.width,
        height: v.height,
        format: v.format,
        publicUrl: v.publicUrl,
      })) || [],
  };
}

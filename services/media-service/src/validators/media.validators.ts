import { z } from "zod";
import { BUCKETS, BucketName } from "../config/storage";

const validBuckets = Object.keys(BUCKETS) as [string, ...string[]];

export const uploadFileSchema = z.object({
  bucket: z.enum(validBuckets as [BucketName, ...BucketName[]]).default("general"),
  visibility: z.enum(["public", "private", "authenticated"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const listFilesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  bucket: z.string().optional(),
  category: z.enum(["image", "video", "document", "audio", "archive", "other"]).optional(),
  status: z.enum(["pending", "uploading", "uploaded", "processing", "ready", "failed"]).optional(),
});

export const updateFileSchema = z.object({
  visibility: z.enum(["public", "private", "authenticated"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type ListFilesInput = z.infer<typeof listFilesSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;

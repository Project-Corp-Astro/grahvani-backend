import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { uploadFile } from "../services/upload.service";
import { uploadFileSchema } from "../validators/media.validators";
import { recordUpload } from "../middleware/metrics.middleware";

/**
 * POST /api/v1/media/upload
 * Upload a file with optional bucket and visibility
 */
export async function handleUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authReq = req as AuthRequest;

    if (!req.file) {
      return res.status(400).json({
        error: { code: "NO_FILE", message: "No file provided in request" },
      });
    }

    // Parse and validate body
    const parsed = uploadFileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid upload parameters",
          details: parsed.error.flatten().fieldErrors,
        },
      });
    }

    const { bucket, visibility, metadata } = parsed.data;
    const tenantId =
      (authReq as any).user?.tenantId || (authReq as any).tenantId;
    const userId = (authReq as any).user?.userId || (authReq as any).userId;

    if (!tenantId || !userId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing tenant or user context",
        },
      });
    }

    const result = await uploadFile(req.file, tenantId, userId, bucket, {
      visibility,
      metadata,
    });

    // Record metrics
    recordUpload(bucket, result.category, result.size);

    return res.status(201).json({
      success: true,
      data: { file: result },
    });
  } catch (err) {
    next(err);
  }
}

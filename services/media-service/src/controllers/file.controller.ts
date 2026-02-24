import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getFile, listFiles, updateFile, deleteFile } from "../services/file.service";
import { listFilesSchema, updateFileSchema } from "../validators/media.validators";

/**
 * GET /api/v1/media
 * List files for the authenticated user's tenant
 */
export async function handleListFiles(req: Request, res: Response, next: NextFunction) {
    try {
        const authReq = req as AuthRequest;
        const tenantId = (authReq as any).user?.tenantId || (authReq as any).tenantId;

        const parsed = listFilesSchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid query parameters",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        const result = await listFiles(tenantId, {
            userId: (authReq as any).user?.userId,
            ...parsed.data,
        });

        return res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/media/:id
 * Get file details with variants
 */
export async function handleGetFile(req: Request, res: Response, next: NextFunction) {
    try {
        const authReq = req as AuthRequest;
        const tenantId = (authReq as any).user?.tenantId || (authReq as any).tenantId;
        const fileId = req.params.id;

        const file = await getFile(fileId, tenantId);
        return res.json({ success: true, data: { file } });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/v1/media/:id
 * Update file visibility or metadata
 */
export async function handleUpdateFile(req: Request, res: Response, next: NextFunction) {
    try {
        const authReq = req as AuthRequest;
        const tenantId = (authReq as any).user?.tenantId || (authReq as any).tenantId;
        const userId = (authReq as any).user?.userId || (authReq as any).userId;
        const fileId = req.params.id;

        const parsed = updateFileSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid update parameters",
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }

        const file = await updateFile(fileId, tenantId, userId, parsed.data);
        return res.json({ success: true, data: { file } });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/v1/media/:id
 * Soft-delete a file and its variants
 */
export async function handleDeleteFile(req: Request, res: Response, next: NextFunction) {
    try {
        const authReq = req as AuthRequest;
        const tenantId = (authReq as any).user?.tenantId || (authReq as any).tenantId;
        const userId = (authReq as any).user?.userId || (authReq as any).userId;
        const fileId = req.params.id;

        await deleteFile(fileId, tenantId, userId);
        return res.json({ success: true, message: "File deleted" });
    } catch (err) {
        next(err);
    }
}

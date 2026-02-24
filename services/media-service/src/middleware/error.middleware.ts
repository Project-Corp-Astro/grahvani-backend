import { Request, Response, NextFunction } from "express";
import { MediaError } from "../errors/media.errors";
import { logger } from "../config/logger";

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Multer errors
  if (err.message?.includes("File type not allowed")) {
    return res.status(400).json({
      error: { code: "INVALID_FILE_TYPE", message: err.message },
    });
  }

  if (err.message?.includes("File too large")) {
    return res.status(400).json({
      error: {
        code: "FILE_TOO_LARGE",
        message: "File exceeds maximum allowed size",
      },
    });
  }

  // Custom media errors
  if (err instanceof MediaError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Unexpected errors
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An internal error occurred" },
  });
}

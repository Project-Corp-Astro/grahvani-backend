// Global Error Middleware
import { Request, Response, NextFunction } from "express";
import { BaseError } from "@grahvani/contracts";
import { logger } from "../../../config/logger";

export function errorMiddleware(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId =
    (req as any).requestId || req.headers["x-request-id"] || "unknown";
  const statusCode =
    err instanceof BaseError ? err.statusCode : err.statusCode || 500;
  const code =
    err instanceof BaseError ? err.code : err.code || "INTERNAL_ERROR";

  logger.error({
    err,
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
  });

  res.status(statusCode).json({
    error: {
      code,
      message:
        statusCode === 500 ? "An unexpected error occurred" : err.message,
      requestId,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
}

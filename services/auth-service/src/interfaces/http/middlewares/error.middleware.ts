// Global Error Middleware
import { Request, Response, NextFunction } from "express";
import { logger } from "../../../config/logger";

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  logger.error({
    err,
    method: req.method,
    path: req.path,
    statusCode,
  });

  res.status(statusCode).json({
    error: {
      code,
      message: err.message || "An unexpected error occurred",
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  });
}

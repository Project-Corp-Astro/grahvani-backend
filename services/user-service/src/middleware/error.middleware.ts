// Global Error Handling Middleware
import { Request, Response, NextFunction } from "express";
import { BaseError } from "@grahvani/contracts";
import { logger } from "../config/logger";

export const errorMiddleware = (error: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).requestId || req.headers["x-request-id"] || "unknown";

  logger.error({ err: error, requestId }, "Request error");

  if (error instanceof BaseError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Prisma errors
  if (error.name === "PrismaClientKnownRequestError") {
    return res.status(400).json({
      error: {
        code: "DATABASE_ERROR",
        message: "A database error occurred",
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Generic error
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

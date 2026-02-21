import { Request, Response, NextFunction } from "express";
import { BaseError } from "@grahvani/contracts";
import { logger } from "../config";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId =
    (req as any).requestId || req.headers["x-request-id"] || "unknown";

  // Custom base error
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    const details: Record<string, string> = {};
    err.errors.forEach((e: any) => {
      details[e.path.join(".")] = e.message;
    });

    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Data validation failed",
        details,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Prisma unique constraint errors (P2002)
  if (err.code === "P2002") {
    const target = err.meta?.target || "fields";
    return res.status(409).json({
      error: {
        code: "DUPLICATE_RECORD",
        message: `A record with this ${target} already exists.`,
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Log unknown errors
  logger.error(
    {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId,
    },
    "Unhandled Exception",
  );

  // Default error
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

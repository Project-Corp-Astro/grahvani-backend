import { Request, Response, NextFunction } from "express";
import { BaseError } from "../errors/client.errors";
import { logger } from "../config";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // If it's our custom base error
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Zod validation errors
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
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Prisma unique constraint errors (P2002)
  if (err.code === "P2002") {
    const target = err.meta?.target || "fields";
    return res.status(409).json({
      error: {
        code: "DUPLICATE_RECORD",
        message: `A record with this ${target} already exists.`,
        requestId: `req_${Math.random().toString(36).substring(2, 11)}`,
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
    },
    "Unhandled Exception",
  );

  // Default error
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId: `req_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
    },
  });
};

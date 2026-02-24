import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An internal error occurred" },
  });
}

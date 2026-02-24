import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware that generates or forwards a request correlation ID.
 * Sets `req.requestId` and the `x-request-id` response header.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}

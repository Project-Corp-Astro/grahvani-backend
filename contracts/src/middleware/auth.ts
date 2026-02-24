/**
 * Shared JWT Auth Middleware Factory
 *
 * Creates an Express auth middleware that:
 * - Validates Bearer tokens
 * - Verifies JWT signature
 * - Checks token version against Redis (single-session enforcement)
 * - Optionally checks token blacklist
 *
 * Usage in services:
 *   import { createAuthMiddleware, AuthRequest } from "@grahvani/contracts";
 *   export const authMiddleware = createAuthMiddleware({
 *     getRedisClient: () => redisClient,
 *     checkBlacklist: true, // optional, default false
 *   });
 */

import type { Request, Response, NextFunction } from "express";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  sessionId: string;
  version: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  requestId?: string;
}

export interface RedisLike {
  get(key: string): Promise<string | null>;
}

export interface AuthMiddlewareOptions {
  getRedisClient: () => RedisLike;
  checkBlacklist?: boolean;
}

/**
 * Creates a JWT auth middleware with configurable options.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "No token provided" },
      });
    }

    const token = authHeader.split(" ")[1];
    const redis = options.getRedisClient();

    // Optional blacklist check
    if (options.checkBlacklist) {
      try {
        // Dynamic import to avoid hard dependency on crypto
        const crypto = await import("crypto");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const isBlacklisted = await redis.get(`blacklist:${tokenHash}`);

        if (isBlacklisted === "1") {
          return res.status(401).json({
            error: {
              code: "UNAUTHORIZED",
              message: "Token has been revoked. Please login again.",
            },
          });
        }
      } catch {
        // If blacklist check fails, continue — don't block the request
      }
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET environment variable is not set. Server cannot verify tokens.");
      }

      // Dynamic import to avoid hard dependency on jsonwebtoken
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.verify(token, secret) as any;

      // Single-session enforcement via token versioning
      const userId = decoded.sub || decoded.id;
      const tokenVersion = decoded.version || 0;

      const currentVersionStr = await redis.get(`token_version:${userId}`);
      const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 0;

      if (tokenVersion < currentVersion) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message:
              "Your session has expired because you logged in from another device. Please login again.",
          },
        });
      }

      req.user = {
        id: userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
        sessionId: decoded.sessionId,
        version: tokenVersion,
      };

      next();
    } catch (error: any) {
      if (error?.name === "TokenExpiredError") {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Token has expired" },
        });
      }

      if (error?.name === "JsonWebTokenError") {
        return res.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Invalid token" },
        });
      }

      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication failed" },
      });
    }
  };
}

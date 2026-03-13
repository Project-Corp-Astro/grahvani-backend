// Admin Authentication Middleware
// Verifies JWT and enforces admin role
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { logger } from "../config/logger";

export interface AdminUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface AdminRequest extends Request {
  adminUser?: AdminUser;
}

export const adminAuthMiddleware = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
          timestamp: new Date().toISOString(),
        },
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.jwt.secret) as {
      sub?: string;        // Standard JWT claim (auth-service uses this)
      userId?: string;     // Legacy fallback
      email: string;
      role: string;
      tenantId: string;
    };

    // auth-service signs with `sub` (standard JWT), not `userId`
    const userId = decoded.sub || decoded.userId;

    if (!userId) {
      logger.warn("Admin JWT missing user identifier (sub/userId)");
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token structure",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (decoded.role !== "admin" && decoded.role !== "moderator") {
      logger.warn(
        { userId, role: decoded.role },
        "Unauthorized role attempted admin access"
      );
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Administrative access required",
          timestamp: new Date().toISOString(),
        },
      });
    }

    req.adminUser = {
      userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: {
          code: "TOKEN_EXPIRED",
          message: "Access token has expired",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid access token",
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.error({ error }, "Admin auth middleware error");
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Authentication failed",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

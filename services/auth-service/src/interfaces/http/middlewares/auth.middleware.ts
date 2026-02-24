// Auth Middleware - JWT Verification
import { Request, Response, NextFunction } from "express";
import { TokenService } from "../../../services/token.service";
import { logger } from "../../../config/logger";

const tokenService = new TokenService();

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token
    const payload = await tokenService.verifyAccessToken(token);

    // Attach user to request
    (req as any).user = payload;

    next();
  } catch (error) {
    logger.debug({ error }, "Auth middleware failed");
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
      },
    });
  }
}

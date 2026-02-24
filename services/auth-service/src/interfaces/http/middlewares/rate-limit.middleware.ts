// Rate Limiting Middleware
// Prevents brute force attacks on authentication endpoints
import { Request, Response, NextFunction } from "express";
import { getRedisClient } from "../../../config/redis";
import { logger } from "../../../config/logger";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix
}

const isProd = process.env.NODE_ENV === "production";

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: isProd ? 10 : 50, // Strict in prod, relaxed in dev
    keyPrefix: "rate:login",
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: isProd ? 5 : 100, // 5 registrations/hour in prod
    keyPrefix: "rate:register",
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: isProd ? 5 : 100, // 5 resets/hour in prod
    keyPrefix: "rate:reset",
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: isProd ? 100 : 5000,
    keyPrefix: "rate:api",
  },
};

export function createRateLimiter(type: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[type];
  const redis = getRedisClient();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Bypass rate limiting in development
    if (process.env.NODE_ENV !== "production") {
      return next();
    }

    try {
      // Use IP + email (if available) as key
      const email = req.body?.email || "";
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const key = `${config.keyPrefix}:${ip}:${email}`;

      // Increment counter
      const count = await redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await redis.pexpire(key, config.windowMs);
      }

      // Get remaining TTL
      const ttl = await redis.pttl(key);

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": config.maxRequests.toString(),
        "X-RateLimit-Remaining": Math.max(0, config.maxRequests - count).toString(),
        "X-RateLimit-Reset": Math.ceil((Date.now() + ttl) / 1000).toString(),
      });

      if (count > config.maxRequests) {
        logger.warn({ ip, email, type }, "Rate limit exceeded");

        return res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests, please try again later",
            retryAfter: Math.ceil(ttl / 1000),
          },
        });
      }

      next();
    } catch (error) {
      // Don't block requests if Redis fails
      logger.error({ error }, "Rate limiter error");
      next();
    }
  };
}

// Pre-configured rate limiters
export const loginRateLimiter = createRateLimiter("login");
export const registerRateLimiter = createRateLimiter("register");
export const passwordResetRateLimiter = createRateLimiter("passwordReset");
export const apiRateLimiter = createRateLimiter("api");

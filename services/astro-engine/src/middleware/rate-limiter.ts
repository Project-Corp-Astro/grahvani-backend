import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../config/logger';

// =============================================================================
// RATE LIMITING MIDDLEWARE
// Protects the service from DDoS and excessive requests
// =============================================================================

/**
 * API Rate Limiter
 * For public-facing /api/* routes
 */
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // 100 requests per minute per IP
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: 60,
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,  // Disable `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
        logger.warn({
            ip: req.ip,
            path: req.path,
            userAgent: req.get('user-agent'),
        }, 'Rate limit exceeded');

        res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: 60,
        });
    },
    skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/ready' || req.path === '/live';
    },
});

/**
 * Internal Service Rate Limiter
 * Higher limits for trusted internal services
 */
export const internalRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 500, // 500 requests per minute (5x more for internal)
    message: {
        success: false,
        error: 'Internal rate limit exceeded. Service may be under high load.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        logger.error({
            ip: req.ip,
            path: req.path,
            serviceName: req.get('X-Service-Name'),
        }, 'Internal rate limit exceeded - possible service issue');

        res.status(429).json({
            success: false,
            error: 'Internal rate limit exceeded. Service may be under high load.',
        });
    },
});

/**
 * Strict Rate Limiter
 * For computationally expensive endpoints (e.g., full chart calculations)
 */
export const strictRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30, // 30 requests per minute
    message: {
        success: false,
        error: 'Complex calculation rate limit exceeded. Please wait before requesting more charts.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

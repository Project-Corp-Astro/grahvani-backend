import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        tenantId: string;
        sessionId: string;
        version: number;
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'No token provided' }
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_SECRET || 'your-default-secret-key';
        const decoded = jwt.verify(token, secret) as any;

        // --- SINGLE SESSION CHECK (Token Versioning) ---
        const redis = getRedisClient();
        const userId = decoded.sub || decoded.id;
        const tokenVersion = decoded.version || 0;

        // Check current version in Redis
        const currentVersionStr = await redis.get(`token_version:${userId}`);
        const currentVersion = currentVersionStr ? parseInt(currentVersionStr, 10) : 0;

        if (tokenVersion < currentVersion) {
            console.warn(`[authMiddleware] Token version mismatch for user ${userId}. Token: ${tokenVersion}, Current: ${currentVersion}`);
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Your session has expired because you logged in from another device. Please login again.'
                }
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
    } catch (error) {
        console.error('[authMiddleware] JWT Verification Error:', error);
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
        });
    }
};

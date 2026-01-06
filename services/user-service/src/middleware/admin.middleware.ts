// Admin Middleware - Checks for admin role
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
                timestamp: new Date().toISOString(),
            },
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: {
                code: 'FORBIDDEN',
                message: 'Admin access required',
                timestamp: new Date().toISOString(),
            },
        });
    }

    next();
};

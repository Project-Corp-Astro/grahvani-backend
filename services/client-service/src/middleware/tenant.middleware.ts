import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UnauthorizedAccessError } from '../errors/client.errors';

/**
 * Ensures a tenantId is present in the request user object.
 * This should be placed AFTER authMiddleware.
 */
export const tenantMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.tenantId) {
        return next(new UnauthorizedAccessError());
    }

    // Optional: Verify tenant exists in database or cache if needed
    // For now, trust the JWT claim as it was verified by AuthMiddleware

    next();
};

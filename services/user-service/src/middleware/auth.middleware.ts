import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        tenantId: string;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'No token provided' }
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
        const decoded = jwt.verify(token, secret) as any;

        req.user = {
            id: decoded.sub || decoded.id,
            email: decoded.email,
            role: decoded.role,
            tenantId: decoded.tenantId,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
        });
    }
};

// Global Error Handling Middleware
import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../errors';
import { v4 as uuidv4 } from 'uuid';

export const errorMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const requestId = uuidv4();

    console.error(`[Error] ${requestId}:`, error);

    if (error instanceof BaseError) {
        return res.status(error.statusCode).json({
            error: {
                code: error.code,
                message: error.message,
                requestId,
                timestamp: new Date().toISOString(),
            },
        });
    }

    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            error: {
                code: 'DATABASE_ERROR',
                message: 'A database error occurred',
                requestId,
                timestamp: new Date().toISOString(),
            },
        });
    }

    // Generic error
    return res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            requestId,
            timestamp: new Date().toISOString(),
        },
    });
};

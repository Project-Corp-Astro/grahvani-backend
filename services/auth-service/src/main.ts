// Auth Service - Main Entry Point (Enhanced)
process.env.TZ = 'Asia/Kolkata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authRoutes } from './interfaces/http/routes/auth.routes';
import { internalRoutes } from './interfaces/http/routes/internal.routes';
import { errorMiddleware } from './interfaces/http/middlewares/error.middleware';
import { logger } from './config/logger';
import { getDatabaseManager, performHealthCheck, getDBMetrics } from './config/db-pro';

const app = express();

// ============ INITIALIZE DATABASE (PRO PLAN) ============
const dbManager = getDatabaseManager();
logger.info('✅ Supabase PRO Plan database manager initialized');
logger.info('🔋 Connection pooling: 5-20 connections, 100+ max');
logger.info('🔄 Exponential backoff retries enabled');
logger.info('💾 Query caching enabled (1-minute TTL)');

// Trust proxy for correct IP capture behind load balancers/Nginx
app.set('trust proxy', true);

// ============ SECURITY MIDDLEWARES ============
app.use(helmet());
app.use(cors({
    origin: config.env === 'production'
        ? ['https://grahvani.com', 'https://admin.grahvani.com']
        : '*',
    credentials: true,
}));
app.use(express.json({ limit: '10kb' })); // Limit body size

// ============ REQUEST LOGGING ============
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: Date.now() - start,
            ip: req.ip,
        });
    });
    next();
});

// ============ HEALTH CHECK ============
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'auth-service',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============ DATABASE HEALTH CHECK (PRO PLAN) ============
app.get('/api/health/db', async (_req: Request, res: Response) => {
    try {
        const health = await performHealthCheck();
        const metrics = getDBMetrics();
        
        res.json({
            status: 'ok',
            database: {
                health,
                metrics,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
        });
    }
});

// ============ METRICS ENDPOINT (PRO PLAN) ============
app.get('/api/metrics/database', (_req: Request, res: Response) => {
    try {
        const metrics = getDBMetrics();
        res.json({
            status: 'ok',
            metrics,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({
            error: (error as Error).message,
        });
    }
});

// ============ PUBLIC ROUTES ============
// These are exposed via API Gateway
app.use('/api/v1/auth', authRoutes);

// ============ INTERNAL ROUTES ============
// For API Gateway and service-to-service communication
// Should be blocked at network level in production (internal network only)
app.use('/internal', internalRoutes);

// ============ ERROR HANDLING ============
app.use(errorMiddleware);

// ============ 404 HANDLER ============
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Route not found',
        }
    });
});

// ============ START SERVER ============
const PORT = config.port;
const server = app.listen(PORT, () => {
    logger.info(`🔐 Auth Service running on port ${PORT}`);
    logger.info(`   - Public API: /api/v1/auth/*`);
    logger.info(`   - Internal API: /internal/*`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export { app };

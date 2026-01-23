import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';

import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { getDatabaseManager, performHealthCheck, getDBMetrics } from './config/db-pro';

const app: Express = express();

// Initialize PRO Plan Database Manager on startup
const dbManager = getDatabaseManager();
console.log('✅ Supabase PRO Plan database manager initialized');
console.log('🔋 Connection pooling: 5-20 connections, 100+ max');
console.log('🔄 Exponential backoff retries enabled');
console.log('💾 Query caching enabled (1-minute TTL)');

// Trust proxy for correct IP capture
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pino());

// API Routes
app.use('/api/v1', routes);

// Root Route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'User Service API' });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'user-service' });
});

// Database Health Check
app.get('/api/health/db', async (req: Request, res: Response) => {
    try {
        const health = await performHealthCheck();
        const metrics = getDBMetrics();
        res.status(200).json({
            status: 'ok',
            service: 'user-service',
            database: {
                health: health.status,
                metrics,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            service: 'user-service',
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Database Metrics
app.get('/api/metrics/database', (req: Request, res: Response) => {
    try {
        const metrics = getDBMetrics();
        res.status(200).json({
            status: 'ok',
            service: 'user-service',
            metrics,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            service: 'user-service',
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Global Error Handler (must be last)
app.use(errorMiddleware);

export default app;

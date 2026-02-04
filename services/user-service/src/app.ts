import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';

import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { getDatabaseManager } from './config/db-pro';

const app: Express = express();

// Initialize Database Manager
getDatabaseManager();
console.log('✅ Database manager initialized (Standardized Port 6543)');

// Trust proxy configuration for Rate Limiting
// Dev: false (Direct access, no proxy) | Prod: 1 (Behind single Reverse Proxy)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
} else {
    app.set('trust proxy', false);
}

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

// Global Error Handler (must be last)
app.use(errorMiddleware);

export default app;

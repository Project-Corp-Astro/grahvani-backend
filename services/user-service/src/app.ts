import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';

import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';

const app: Express = express();

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

// Pino Logger Configuration
import pino from 'pino';
import { config } from './index';

export const logger = pino({
    level: config.env === 'production' ? 'info' : 'debug',
    transport: config.env !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
        },
    } : undefined,
});

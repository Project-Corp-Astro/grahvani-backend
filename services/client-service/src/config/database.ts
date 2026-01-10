import { PrismaClient } from '../generated/prisma';
import { logger } from './logger';

let prisma: PrismaClient | null = null;

/**
 * Get centralized Prisma client instance
 */
export const getPrismaClient = (): PrismaClient => {
    if (!prisma) {
        prisma = new PrismaClient({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'info' },
                { emit: 'stdout', level: 'warn' },
            ],
        });

        // Log queries in debug mode
        if (process.env.DEBUG_SQL === 'true') {
            (prisma as any).$on('query', (e: any) => {
                logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
            });
        }

        logger.info('Prisma client initialized for Client Service');
    }
    return prisma;
};

/**
 * Handle graceful shutdown
 */
export const disconnectDb = async () => {
    if (prisma) {
        await prisma.$disconnect();
        logger.info('Database disconnected');
    }
};

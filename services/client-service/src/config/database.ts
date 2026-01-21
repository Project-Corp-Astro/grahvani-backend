/**
 * Enterprise-grade Prisma Database Client for Client Service
 * 
 * Features:
 * - Direct connection (bypasses Supabase PgBouncer limits)
 * - Connection health check
 * - Graceful shutdown
 * - Debug query logging
 * 
 * @module config/database
 */
import { PrismaClient } from '../generated/prisma';
import { logger } from './logger';

// ============ CONFIGURATION ============
const SERVICE_NAME = 'ClientService';
const POOL_SIZE = 5;        // Higher pool for complex chart queries
const POOL_TIMEOUT = 10;    // Fail fast (seconds)
const CONNECT_TIMEOUT = 5;  // Quick failure detection (seconds)

// ============ SINGLETON ============
const globalForPrisma = global as unknown as {
    prisma: PrismaClient;
    isHealthy: boolean;
};

/**
 * Get or create the Prisma client singleton
 * Uses DIRECT_URL (port 5432) to bypass Supabase PgBouncer connection limits
 */
export const getPrismaClient = (): PrismaClient => {
    if (!globalForPrisma.prisma) {
        // Prefer DIRECT_URL (session mode) over DATABASE_URL (transaction pooler)
        // PgBouncer on port 6543 has aggressive global limits causing timeouts
        const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

        if (!directUrl) {
            throw new Error(`[${SERVICE_NAME}] Neither DIRECT_URL nor DATABASE_URL is configured`);
        }

        // Optimal connection parameters for direct connection
        const connectionParams = `connection_limit=${POOL_SIZE}&pool_timeout=${POOL_TIMEOUT}&connect_timeout=${CONNECT_TIMEOUT}`;
        const url = directUrl.includes('?')
            ? `${directUrl}&${connectionParams}`
            : `${directUrl}?${connectionParams}`;

        // Log connection mode (safe: doesn't expose credentials)
        const isDirectConnection = directUrl.includes(':5432');
        console.log(`[${SERVICE_NAME}] Using ${isDirectConnection ? 'DIRECT' : 'POOLED'} connection (pool: ${POOL_SIZE}, timeout: ${POOL_TIMEOUT}s)`);

        globalForPrisma.prisma = new PrismaClient({
            datasources: {
                db: { url }
            },
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
            ],
        });

        // Query logging in debug mode
        if (process.env.DEBUG_SQL === 'true' || process.env.NODE_ENV === 'development') {
            globalForPrisma.prisma.$on('query' as never, (e: any) => {
                logger.debug({ duration: e.duration }, 'Prisma Query');
            });
        }

        // Error logging
        globalForPrisma.prisma.$on('error' as never, (e: any) => {
            logger.error({ error: e }, 'Prisma Error');
            globalForPrisma.isHealthy = false;
        });

        globalForPrisma.isHealthy = true;
        logger.info(`Prisma client initialized for ${SERVICE_NAME} (Global Singleton)`);
    }

    return globalForPrisma.prisma;
};

/**
 * Check database connection health
 * Used by health check endpoints and monitoring
 */
export const checkConnection = async (): Promise<boolean> => {
    try {
        const prisma = getPrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        globalForPrisma.isHealthy = true;
        return true;
    } catch (error) {
        logger.error({ error }, `[${SERVICE_NAME}] Database health check failed`);
        globalForPrisma.isHealthy = false;
        return false;
    }
};

/**
 * Check if database is currently healthy (cached status)
 */
export const isHealthy = (): boolean => {
    return globalForPrisma.isHealthy ?? false;
};

/**
 * Graceful shutdown - disconnect from database
 * Call this on SIGTERM/SIGINT for clean process exit
 */
export const disconnectDb = async (): Promise<void> => {
    if (globalForPrisma.prisma) {
        await globalForPrisma.prisma.$disconnect();
        globalForPrisma.isHealthy = false;
        logger.info(`[${SERVICE_NAME}] Database disconnected`);
    }
};

// Legacy export for backward compatibility
export { disconnectDb as disconnect };


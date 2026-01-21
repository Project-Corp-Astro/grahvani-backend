/**
 * Enterprise-grade Prisma Database Client for Auth Service
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
const SERVICE_NAME = 'AuthService';
const POOL_SIZE = 2;        // Reduced for Supabase free tier limits
const POOL_TIMEOUT = 30;    // Increased patience for background tasks (seconds)
const CONNECT_TIMEOUT = 10; // Patient connection (seconds)

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
        // Port 6543/5439 are usually PgBouncer - need pgbouncer=true flag
        const usePgbouncer = directUrl.includes(':6543') || directUrl.includes(':5439') || directUrl.includes('pgbouncer=true');
        const connectionParams = `connection_limit=${POOL_SIZE}&pool_timeout=${POOL_TIMEOUT}&connect_timeout=${CONNECT_TIMEOUT}${usePgbouncer ? '&pgbouncer=true' : ''}`;
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

        // Query logging in development
        if (process.env.NODE_ENV === 'development') {
            globalForPrisma.prisma.$on('query' as never, (e: any) => {
                // REDACTED: Do not log raw queries to prevent password leakage 
                logger.debug({ duration: e.duration }, 'Prisma Query Executed');
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
export const closePrisma = async (): Promise<void> => {
    if (globalForPrisma.prisma) {
        await globalForPrisma.prisma.$disconnect();
        globalForPrisma.isHealthy = false;
        logger.info(`[${SERVICE_NAME}] Database disconnected`);
    }
};

// Legacy export for backward compatibility
export { closePrisma as disconnect };

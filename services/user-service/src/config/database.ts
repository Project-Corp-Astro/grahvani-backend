/**
 * Stable Prisma Database Client Singleton for User Service
 * 
 * Features:
 * - LAZY initialization - connection only opens on first query
 * - globalThis-based singleton survives hot reloads
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Connection logging for debugging
 * 
 * @module config/database
 */
import { PrismaClient } from '../generated/prisma';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaConnected: boolean;
};

let prismaInstance: PrismaClient | undefined;

/**
 * Get or create Prisma client - LAZY, connection only opens on first query
 */
export const getPrismaClient = (): PrismaClient => {
    if (!prismaInstance) {
        console.log('[UserService] 🔗 Initializing Prisma client (lazy - no connection yet)');

        prismaInstance = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
            errorFormat: 'pretty',
        });

        // Log when first query actually runs
        prismaInstance.$use(async (params, next) => {
            if (!globalForPrisma.prismaConnected) {
                console.log(`[UserService] ⚡ FIRST DB QUERY: ${params.model}.${params.action}`);
                globalForPrisma.prismaConnected = true;
            }
            return next(params);
        });

        if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.prisma = prismaInstance;
        }
    }

    return prismaInstance;
};

// NOTE: Do NOT export a module-level `prisma` constant - it triggers eager connection
// Always use getPrismaClient() for lazy access

// Graceful shutdown handlers
const shutdown = async () => {
    console.log('[UserService] Disconnecting Prisma...');
    if (prismaInstance) {
        await prismaInstance.$disconnect();
    }
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Legacy exports
export const checkConnection = async (): Promise<boolean> => {
    try {
        await getPrismaClient().$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('[UserService] DB connection check failed:', error);
        return false;
    }
};

export const disconnectDb = async () => {
    if (prismaInstance) {
        await prismaInstance.$disconnect();
    }
};
export { disconnectDb as disconnect };

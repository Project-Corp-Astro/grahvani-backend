/**
 * Prisma Database Client Bridge - User Service
 * 
 * Delegates connection management to the standardized DatabaseManager.
 */
import { PrismaClient } from '../generated/prisma';
import { getDatabaseManager } from './db-pro';

let prismaInstance: PrismaClient | undefined;

/**
 * Get Prisma client instance
 */
export const getPrismaClient = (): PrismaClient => {
    if (!prismaInstance) {
        prismaInstance = getDatabaseManager().getPrismaClientSync();
    }
    return prismaInstance;
};

/**
 * Connection check utility
 */
export const checkConnection = async (): Promise<boolean> => {
    try {
        const client = getPrismaClient();
        await client.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('[UserService] DB connection check failed:', error);
        return false;
    }
};

/**
 * Graceful disconnect
 */
export const disconnect = async () => {
    if (prismaInstance) {
        await prismaInstance.$disconnect();
    }
};

export { disconnect as disconnectDb };

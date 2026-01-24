/**
 * Database Connection Manager - Supabase PRO Plan Standardized
 * 
 * Standardized approach for port 6543 (Transaction Pooler):
 * - Direct use of Prisma pooling via connection string parameters
 * - TLS trust handled by Node.js >= 18.18
 * - Configuration managed strictly via .env
 * 
 * @version 3.0 Standardized
 */

import { PrismaClient } from '../generated/prisma';
import { logger } from './logger';

export class DatabaseManager {
    private prismaClient: PrismaClient | null = null;

    constructor() {
        this.initializeClient();
    }

    /**
     * Initialize Prisma client with standard configuration
     */
    private initializeClient(): void {
        try {
            const url = process.env.CLIENT_DATABASE_URL || process.env.DATABASE_URL;
            if (!url) {
                throw new Error('DATABASE_URL not configured in environment');
            }

            logger.info('🚀 Initializing standardized Prisma client (Port 6543)...');

            this.prismaClient = new PrismaClient({
                log: process.env.NODE_ENV === 'development'
                    ? ['warn', 'error']
                    : ['error'],
                errorFormat: 'pretty',
                datasources: {
                    db: {
                        url: url,
                    },
                },
            });

            logger.info('✅ Database client initialized');
        } catch (error) {
            logger.error({ error }, '❌ Failed to initialize database client');
            throw error;
        }
    }

    /**
     * Get Prisma client
     */
    async getClient(): Promise<PrismaClient> {
        if (!this.prismaClient) {
            throw new Error('Database client not initialized');
        }
        return this.prismaClient;
    }

    /**
     * Synchronous getter for wrapper compatibility
     */
    getPrismaClientSync(): PrismaClient {
        if (!this.prismaClient) {
            throw new Error('Database client not initialized');
        }
        return this.prismaClient;
    }

    /**
     * Graceful shutdown
     */
    async disconnect(): Promise<void> {
        if (this.prismaClient) {
            await this.prismaClient.$disconnect();
            logger.info('🔌 Database disconnected');
        }
    }
}

// Singleton Instance
let databaseManagerInstance: DatabaseManager | null = null;

export const getDatabaseManager = (): DatabaseManager => {
    if (!databaseManagerInstance) {
        databaseManagerInstance = new DatabaseManager();
    }
    return databaseManagerInstance;
};

/**
 * Get Prisma client - Primary export for services
 */
export const getPrismaClient = async (): Promise<PrismaClient> => {
    return getDatabaseManager().getClient();
};

/**
 * Cleanup on process exit
 */
const shutdown = async (signal: string) => {
    if (databaseManagerInstance) {
        logger.info(`${signal} received - shutting down database`);
        await databaseManagerInstance.disconnect();
    }
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

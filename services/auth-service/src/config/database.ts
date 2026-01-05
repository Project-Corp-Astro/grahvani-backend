// Prisma Database Client
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
    if (!prismaClient) {
        prismaClient = new PrismaClient({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
            ],
        });

        // Log queries in development
        if (process.env.NODE_ENV === 'development') {
            prismaClient.$on('query' as never, (e: any) => {
                logger.debug({ query: e.query, duration: e.duration }, 'Prisma Query');
            });
        }

        logger.info('Prisma client initialized');
    }
    return prismaClient;
}

export async function closePrisma(): Promise<void> {
    if (prismaClient) {
        await prismaClient.$disconnect();
        prismaClient = null;
    }
}

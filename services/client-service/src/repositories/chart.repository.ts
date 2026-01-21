import { PrismaClient, ClientSavedChart, ChartType } from '../generated/prisma';
import { getPrismaClient } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

const CACHE_TTL = 3600; // 1 hour

export class ChartRepository {
    private prisma = getPrismaClient();
    private fetchPromises = new Map<string, Promise<ClientSavedChart[]>>();

    private getCacheKey(tenantId: string, clientId: string): string {
        return `charts:${tenantId}:${clientId}`;
    }

    private async invalidateCache(tenantId: string, clientId: string) {
        try {
            const redis = getRedisClient();
            if (redis.isOpen) {
                await redis.del(this.getCacheKey(tenantId, clientId));
            }
        } catch (error) {
            logger.warn({ error, clientId }, 'Failed to invalidate chart cache');
        }
    }

    /**
     * Find saved charts for a client
     * Implements Cache-Aside pattern with hit/miss logging
     */
    async findByClientId(tenantId: string, clientId: string): Promise<ClientSavedChart[]> {
        const cacheKey = this.getCacheKey(tenantId, clientId);
        const redis = getRedisClient();

        // 1. Try cache first (Instant check)
        try {
            if (redis.isOpen) {
                const cachedData = await redis.get(cacheKey);
                if (cachedData) {
                    await redis.expire(cacheKey, CACHE_TTL);
                    const charts = JSON.parse(cachedData) as ClientSavedChart[];
                    logger.debug({ clientId, count: charts.length, source: 'REDIS' }, '[CACHE HIT] Charts loaded from Redis');
                    return charts;
                }
            }
        } catch (error) {
            logger.warn({ error, clientId }, 'Redis cache read failed, falling back to DB');
        }

        // 2. Implement Singleflight (Request Coalescing) for DB fetches
        // If another request is already fetching this client's charts, wait for it
        const pendingFetch = this.fetchPromises.get(cacheKey);
        if (pendingFetch) {
            logger.debug({ clientId }, '[COALESCING] Waiting for in-flight DB fetch for same client');
            return pendingFetch;
        }

        // 3. Initiate the actual fetch
        const fetchPromise = (async () => {
            try {
                // Cache miss - fetch from DB
                logger.info({ clientId }, '[CACHE MISS] Fetching charts from database');
                const charts = await this.prisma.clientSavedChart.findMany({
                    where: { tenantId, clientId },
                    orderBy: { createdAt: 'desc' }
                });

                // Write to cache
                if (redis.isOpen && charts.length > 0) {
                    try {
                        await redis.set(cacheKey, JSON.stringify(charts), { EX: CACHE_TTL });
                        logger.debug({ clientId, count: charts.length }, 'Charts cached to Redis');
                    } catch (err) {
                        logger.warn({ err, clientId }, 'Redis cache write failed');
                    }
                }

                logger.info({ clientId, count: charts.length, source: 'DATABASE' }, 'Charts loaded from database');
                return charts;
            } finally {
                // Cleanup: Remove current fetch from promise map once done
                this.fetchPromises.delete(cacheKey);
            }
        })();

        // Store in map so concurrent requests can join
        this.fetchPromises.set(cacheKey, fetchPromise);
        return fetchPromise;
    }

    /**
     * Find specific chart by ID
     */
    async findById(tenantId: string, id: string): Promise<ClientSavedChart | null> {
        return this.prisma.clientSavedChart.findFirst({
            where: { id, tenantId }
        });
    }

    /**
     * Save a chart
     */
    async create(tenantId: string, data: {
        clientId: string;
        chartType: ChartType;
        system?: string;
        chartName?: string;
        chartData: any;
        chartConfig?: any;
        chartImageUrl?: string;
        calculatedAt?: Date;
        createdBy?: string;
    }) {
        const { clientId, chartType, system, ...rest } = data;
        const calculatedAt = data.calculatedAt || new Date();

        const result = await this.prisma.clientSavedChart.upsert({
            where: {
                tenantId_clientId_chartType_system: {
                    tenantId,
                    clientId,
                    chartType,
                    system: system || 'lahiri'
                }
            },
            update: {
                ...rest,
                calculatedAt
            },
            create: {
                ...data,
                tenantId,
                calculatedAt,
                system: system || 'lahiri'
            }
        });

        await this.invalidateCache(tenantId, clientId);
        return result;
    }

    /**
     * Delete all charts for a client (used during regeneration)
     */
    async deleteByClientId(tenantId: string, clientId: string) {
        const result = await this.prisma.clientSavedChart.deleteMany({
            where: { clientId, tenantId }
        });
        await this.invalidateCache(tenantId, clientId);
        return result;
    }

    /**
     * Delete a saved chart
     */
    async delete(tenantId: string, id: string) {
        // We need client ID to invalidate cache, so we might need a lookup if not passed
        // However, this method is rarely used directly without context.
        // For safety, let's fetch the record to get clientId before deleting
        const record = await this.prisma.clientSavedChart.findUnique({
            where: { id, tenantId },
            select: { clientId: true }
        });

        const result = await this.prisma.clientSavedChart.delete({
            where: { id, tenantId }
        });

        if (record?.clientId) {
            await this.invalidateCache(tenantId, record.clientId);
        }

        return result;
    }

    /**
     * Find only metadata (no large JSON) for a client
     * Used for background audits to save bandwidth
     */
    async findMetadataByClientId(tenantId: string, clientId: string): Promise<Partial<ClientSavedChart>[]> {
        return this.prisma.clientSavedChart.findMany({
            where: { tenantId, clientId },
            select: {
                chartType: true,
                system: true
            }
        });
    }
}

export const chartRepository = new ChartRepository();

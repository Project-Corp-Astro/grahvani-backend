import { ClientSavedChart, ChartType } from "../generated/prisma";
import { getPrismaClient } from "../config/database";
import { getRedisClient } from "../config/redis";
import { logger } from "../config/logger";
import { compressChartData, decompressChartData } from "../utils/compression";

const CACHE_TTL = 3600; // 1 hour

// List of chart types that should be compressed (large JSON payloads)
const COMPRESSIBLE_CHARTS: string[] = [
  "dasha",
  "dasha_vimshottari",
  "dasha_chara",
  "dasha_yogini",
  "ashtakavarga_sarva",
  "ashtakavarga_bhinna",
  "ashtakavarga_shodasha",
  "kp_interlinks",
  "kp_interlinks_advanced",
  "kp_interlinks_sl",
  "sudarshana",
  "shodasha_varga_signs",
];

export class ChartRepository {
  private prisma = getPrismaClient();
  private fetchPromises = new Map<string, Promise<ClientSavedChart[]>>();

  private getCacheKey(tenantId: string, clientId: string): string {
    return `charts:${tenantId}:${clientId}`;
  }

  private getSingleChartCacheKey(
    tenantId: string,
    clientId: string,
    type: string,
    system: string,
  ): string {
    return `chart:single:${tenantId}:${clientId}:${type.toLowerCase()}:${(system || "lahiri").toLowerCase()}`;
  }

  private async invalidateCache(tenantId: string, clientId: string) {
    try {
      const redis = getRedisClient();
      if (redis.isOpen) {
        // Invalidate the full list cache
        await redis.del(this.getCacheKey(tenantId, clientId));

        // Invalidate all single chart caches for this client using scan/pattern
        // Note: For high-traffic production, consider using a Set to track keys
        // or a Redis Hash to avoid SCAN overhead.
        const pattern = `chart:single:${tenantId}:${clientId}:*`;
        let cursor = 0;
        do {
          const reply = await redis.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = reply.cursor;
          if (reply.keys.length > 0) {
            await redis.del(reply.keys);
          }
        } while (cursor !== 0);
      }
    } catch (error) {
      logger.warn({ error, clientId }, "Failed to invalidate chart cache");
    }
  }

  /**
   * Find saved charts for a client
   * Implements Cache-Aside pattern with hit/miss logging
   */
  async findByClientId(
    tenantId: string,
    clientId: string,
  ): Promise<ClientSavedChart[]> {
    const cacheKey = this.getCacheKey(tenantId, clientId);
    const redis = getRedisClient();

    // 1. Try cache first (Instant check)
    try {
      if (redis.isOpen) {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          await redis.expire(cacheKey, CACHE_TTL);
          const charts = JSON.parse(cachedData) as ClientSavedChart[];
          logger.debug(
            { clientId, count: charts.length, source: "REDIS" },
            "[CACHE HIT] Charts loaded from Redis",
          );
          // Decompress any compressed chart data from cache
          return charts.map((chart) => ({
            ...chart,
            chartData: decompressChartData(chart.chartData),
          }));
        }
      }
    } catch (error) {
      logger.warn(
        { error, clientId },
        "Redis cache read failed, falling back to DB",
      );
    }

    // 2. Implement Singleflight (Request Coalescing) for DB fetches
    // If another request is already fetching this client's charts, wait for it
    const pendingFetch = this.fetchPromises.get(cacheKey);
    if (pendingFetch) {
      logger.debug(
        { clientId },
        "[COALESCING] Waiting for in-flight DB fetch for same client",
      );
      return pendingFetch;
    }

    // 3. Initiate the actual fetch
    const fetchPromise = (async () => {
      try {
        // Cache miss - fetch from DB
        logger.info({ clientId }, "[CACHE MISS] Fetching charts from database");
        const charts = await this.prisma.clientSavedChart.findMany({
          where: { tenantId, clientId },
          orderBy: { createdAt: "desc" },
        });

        // Write to cache
        if (redis.isOpen && charts.length > 0) {
          try {
            await redis.set(cacheKey, JSON.stringify(charts), {
              EX: CACHE_TTL,
            });
            logger.debug(
              { clientId, count: charts.length },
              "Charts cached to Redis",
            );
          } catch (err) {
            logger.warn({ err, clientId }, "Redis cache write failed");
          }
        }

        logger.info(
          { clientId, count: charts.length, source: "DATABASE" },
          "Charts loaded from database",
        );

        // Decompress any compressed chart data
        return charts.map((chart) => ({
          ...chart,
          chartData: decompressChartData(chart.chartData),
        }));
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
  async findById(
    tenantId: string,
    id: string,
  ): Promise<ClientSavedChart | null> {
    const chart = await this.prisma.clientSavedChart.findFirst({
      where: { id, tenantId },
    });
    if (!chart) return null;
    return {
      ...chart,
      chartData: decompressChartData(chart.chartData),
    };
  }

  /**
   * Highly Optimized: Find specific chart for a client by type and system.
   * Uses Cache-Aside pattern with Redis for O(1) primary lookup.
   */
  async findOneByTypeAndSystem(
    tenantId: string,
    clientId: string,
    type: ChartType,
    system: string,
  ): Promise<ClientSavedChart | null> {
    const cacheKey = this.getSingleChartCacheKey(
      tenantId,
      clientId,
      type.toString(),
      system,
    );
    const redis = getRedisClient();

    // 1. Try Redis Cache first
    try {
      if (redis.isOpen) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const chart = JSON.parse(cached) as ClientSavedChart;
          logger.debug(
            { clientId, type, system, source: "REDIS" },
            "[CACHE HIT] Single chart loaded from Redis",
          );
          return {
            ...chart,
            chartData: decompressChartData(chart.chartData),
          };
        }
      }
    } catch (error) {
      logger.warn({ error, clientId, type }, "Redis single chart read failed");
    }

    // 2. Fallback to Database
    const chart = await this.prisma.clientSavedChart.findUnique({
      where: {
        tenantId_clientId_chartType_system: {
          tenantId,
          clientId,
          chartType: type,
          system: system || "lahiri",
        },
      },
    });

    if (!chart) return null;

    // 3. Populate Cache
    if (redis.isOpen) {
      try {
        await redis.set(cacheKey, JSON.stringify(chart), {
          EX: CACHE_TTL,
        });
      } catch (err) {
        logger.warn({ err, clientId }, "Redis single chart write failed");
      }
    }

    return {
      ...chart,
      chartData: decompressChartData(chart.chartData),
    };
  }

  async create(
    tenantId: string,
    data: {
      clientId: string;
      chartType: ChartType;
      system?: string;
      chartName?: string;
      chartData: any;
      chartConfig?: any;
      chartImageUrl?: string;
      calculatedAt?: Date;
      createdBy?: string;
    },
  ) {
    const { clientId, chartType, system, ...rest } = data;
    const calculatedAt = data.calculatedAt || new Date();

    // Compress chart data for large payloads (reduces disk IO significantly)
    const chartTypeStr = chartType.toString().toLowerCase();
    const shouldCompress = COMPRESSIBLE_CHARTS.some((t) =>
      chartTypeStr.includes(t),
    );
    const processedChartData = shouldCompress
      ? compressChartData(data.chartData)
      : data.chartData;

    const result = await this.prisma.clientSavedChart.upsert({
      where: {
        tenantId_clientId_chartType_system: {
          tenantId,
          clientId,
          chartType,
          system: system || "lahiri",
        },
      },
      update: {
        ...rest,
        chartData: processedChartData,
        calculatedAt,
      },
      create: {
        ...data,
        chartData: processedChartData,
        tenantId,
        calculatedAt,
        system: system || "lahiri",
      },
    });

    await this.invalidateCache(tenantId, clientId);
    return {
      ...result,
      chartData: decompressChartData(result.chartData),
    };
  }

  /**
   * Update an existing chart by ID
   */
  async update(tenantId: string, id: string, data: any) {
    let processedData = data;

    // If updating chartData, ensure it's compressed if needed
    if (data.chartData && data.chartType) {
      const chartTypeStr = data.chartType.toString().toLowerCase();
      const shouldCompress = COMPRESSIBLE_CHARTS.some((t) =>
        chartTypeStr.includes(t),
      );
      if (shouldCompress) {
        processedData = {
          ...data,
          chartData: compressChartData(data.chartData),
        };
      }
    }

    const result = await this.prisma.clientSavedChart.update({
      where: { id, tenantId },
      data: processedData,
    });

    if (result.clientId) {
      await this.invalidateCache(tenantId, result.clientId);
    }
    return {
      ...result,
      chartData: decompressChartData(result.chartData),
    };
  }

  /**
   * Delete all charts for a client (used during regeneration)
   */
  async deleteByClientId(tenantId: string, clientId: string) {
    const result = await this.prisma.clientSavedChart.deleteMany({
      where: { clientId, tenantId },
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
      select: { clientId: true },
    });

    const result = await this.prisma.clientSavedChart.delete({
      where: { id, tenantId },
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
  async findMetadataByClientId(
    tenantId: string,
    clientId: string,
  ): Promise<Partial<ClientSavedChart>[]> {
    return this.prisma.clientSavedChart.findMany({
      where: { tenantId, clientId },
      select: {
        chartType: true,
        system: true,
        calculatedAt: true,
      },
    });
  }
}

export const chartRepository = new ChartRepository();

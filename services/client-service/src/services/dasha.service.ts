/**
 * Enhanced Dasha Service with Multi-Layer Caching
 * Production-Grade Implementation
 * Designed for 13+ year enterprise architecture
 */

import { chartRepository } from "../repositories/chart.repository";
import { clientRepository } from "../repositories/client.repository";
import { astroEngineClient } from "../clients/astro-engine.client";
import { advancedCacheManager } from "../utils/advanced-cache";
import { logger } from "../config";
import { ClientNotFoundError } from "../errors/client.errors";
import { RequestMetadata } from "./client.service";

export class EnhancedDashaService {
  /**
   * Generate Alternative Dasha with Multi-Layer Caching
   *
   * Cache Strategy:
   * 1. Check in-memory cache (ultra-fast)
   * 2. Check database for previously saved charts (fast)
   * 3. Call Astro Engine (which has Redis cache)
   * 4. Calculate fresh if needed
   *
   * Returns: { data, source: 'memory|database|redis|calculation', cached: boolean }
   */
  async generateAlternativeDashaWithCache(
    tenantId: string,
    clientId: string,
    dashaType: string,
    ayanamsa: "lahiri" | "kp" | "raman" = "lahiri",
    level: string = "mahadasha",
    save: boolean = false,
    metadata: RequestMetadata,
  ) {
    logger.info(
      {
        tenantId,
        clientId,
        dashaType,
        ayanamsa,
        level,
        save,
      },
      "📊 Enhanced Dasha generation initiated",
    );

    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    if (
      !client.birthDate ||
      !client.birthTime ||
      !client.birthLatitude ||
      !client.birthLongitude
    ) {
      throw new Error("Client birth details incomplete.");
    }

    const birthData = {
      birthDate: client.birthDate.toISOString().split("T")[0],
      birthTime: this.extractTimeString(client.birthTime),
      latitude: Number(client.birthLatitude),
      longitude: Number(client.birthLongitude),
      timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
      ayanamsa,
    };

    // Use multi-layer caching
    const cacheResult = await advancedCacheManager.multiLayerGet(
      `dasha:${dashaType}`,
      birthData,
      {
        // Layer 1: Check if saved in database previously
        database: async () => {
          try {
            const savedCharts = await chartRepository.findByClientId(
              tenantId,
              clientId,
            );
            const matching = savedCharts.find(
              (chart) =>
                chart.chartType === "dasha" &&
                (chart.chartConfig as any)?.dashaType === dashaType &&
                (chart.chartConfig as any)?.system === ayanamsa,
            );

            if (matching) {
              logger.info(
                {
                  dashaType,
                  ayanamsa,
                  chartId: matching.id,
                },
                "✅ Dasha found in database cache",
              );
              return matching.chartData;
            }
            return null;
          } catch (error) {
            logger.error({ error }, "Database cache lookup failed");
            return null;
          }
        },

        // Layer 2: Call Astro Engine (has Redis cache internally)
        redis: async () => {
          try {
            const result = await astroEngineClient.getAlternativeDasha(
              birthData,
              dashaType,
            );
            logger.info(
              {
                dashaType,
                cached: result.cached,
              },
              "🟢 Astro Engine response received",
            );
            return result.data;
          } catch (error) {
            logger.error({ error, dashaType }, "Astro Engine call failed");
            return null;
          }
        },

        // Layer 3: Calculate fresh (fallback)
        calculation: async () => {
          logger.warn(
            { dashaType },
            "⚠️ Calculating fresh dasha (all caches missed)",
          );
          const result = await astroEngineClient.getAlternativeDasha(
            birthData,
            dashaType,
          );
          return result.data;
        },
      },
    );

    const result = {
      clientId,
      clientName: client.fullName,
      dashaType,
      level,
      ayanamsa,
      data: cacheResult.data,
      cacheSource: cacheResult.source,
      cached: cacheResult.cached,
      calculatedAt: new Date().toISOString(),
    };

    // Optional: Save to database for future use
    if (save && cacheResult.source === "calculation") {
      try {
        const chart = await this.saveDashaToDatabase(
          tenantId,
          clientId,
          dashaType,
          ayanamsa,
          result.data,
          metadata,
        );
        logger.info(
          {
            tenantId,
            clientId,
            dashaType,
            chartId: chart.id,
          },
          "💾 Dasha saved to database",
        );

        return {
          ...chart,
          data: chart.chartData,
          cacheSource: "database",
          clientName: client.fullName,
        };
      } catch (error) {
        logger.error({ error }, "Failed to save dasha to database");
        return result;
      }
    }

    return result;
  }

  /**
   * Preload frequently used dashas for a client
   * Populates cache before user requests
   */
  async preloadDashaCache(
    tenantId: string,
    clientId: string,
    dashaTypes: string[] = ["tribhagi", "shodashottari", "dwadashottari"],
    ayanamsa: "lahiri" | "kp" | "raman" = "lahiri",
  ) {
    logger.info(
      {
        tenantId,
        clientId,
        dashaCount: dashaTypes.length,
      },
      "⏳ Preloading dasha cache",
    );

    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    if (
      !client.birthDate ||
      !client.birthTime ||
      !client.birthLatitude ||
      !client.birthLongitude
    ) {
      throw new Error("Client birth details incomplete.");
    }

    const birthData = {
      birthDate: client.birthDate.toISOString().split("T")[0],
      birthTime: this.extractTimeString(client.birthTime),
      latitude: Number(client.birthLatitude),
      longitude: Number(client.birthLongitude),
      timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
      ayanamsa,
    };

    const preloadResults = await Promise.allSettled(
      dashaTypes.map((dashaType) =>
        astroEngineClient.getAlternativeDasha(birthData, dashaType),
      ),
    );

    const successful = preloadResults.filter(
      (r) => r.status === "fulfilled",
    ).length;
    const failed = preloadResults.filter((r) => r.status === "rejected").length;

    logger.info(
      {
        clientId,
        successful,
        failed,
        total: dashaTypes.length,
      },
      "✅ Dasha preload completed",
    );

    return { successful, failed, total: dashaTypes.length };
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return advancedCacheManager.getStats();
  }

  /**
   * Clear dasha cache for a specific client
   * Useful when birth data changes
   */
  invalidateDashaCache(
    clientId: string,
    reason: string = "client_data_update",
  ): number {
    logger.warn({ clientId, reason }, "🗑️ Invalidating dasha cache");
    return advancedCacheManager.invalidateRelated("dasha", clientId);
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private extractTimeString(birthTime: Date | string): string {
    if (typeof birthTime === "string") return birthTime;
    const time = new Date(birthTime);
    return `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`;
  }

  private parseTimezoneOffset(timezone: string | null): number {
    if (!timezone) return 0;
    // Parse "UTC+05:30", "UTC-05:00", etc.
    const match = timezone.match(/UTC([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    const sign = match[1] === "+" ? 1 : -1;
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);
    return (sign * (hours * 60 + minutes)) / 60;
  }

  private async saveDashaToDatabase(
    tenantId: string,
    clientId: string,
    dashaType: string,
    ayanamsa: string,
    data: any,
    metadata: RequestMetadata,
  ) {
    return chartRepository.create(tenantId, {
      clientId,
      chartType: "dasha",
      chartName: `${dashaType.toUpperCase()} Dasha (${ayanamsa.toUpperCase()})`,
      chartData: data,
      chartConfig: {
        system: ayanamsa,
        dashaType,
        preloadedAt: new Date().toISOString(),
      },
      calculatedAt: new Date(),
      createdBy: metadata.userId,
    });
  }
}

export const enhancedDashaService = new EnhancedDashaService();

import { YogaDoshaCategory } from "../generated/prisma";
import { yogaDoshaRepository } from "../repositories/yoga-dosha.repository";
import { logger } from "../config/logger";

export class YogaDoshaService {
  /**
   * Store a yoga/dosha analysis result in the dedicated table.
   * Directly stores the raw JSON from the Astro Engine.
   * This method is non-fatal: if it fails, the primary flow is unaffected.
   */
  async storeYogaDosha(
    tenantId: string,
    clientId: string,
    category: "yoga" | "dosha",
    type: string,
    system: string,
    analysisData: any,
  ) {
    // Unwrap engine response wrapper {data: actualData, cached: bool}
    const storedData =
      analysisData?.data && typeof analysisData.data === "object" && "cached" in analysisData
        ? analysisData.data
        : analysisData;

    try {
      await yogaDoshaRepository.upsert(tenantId, {
        clientId,
        category: category as YogaDoshaCategory,
        type,
        isPresent: null, // No longer extracting presence as per manager requirement
        system,
        analysisData: storedData,
        calculatedAt: new Date(),
      });

      logger.debug(
        { clientId, category, type, system },
        "Raw Yoga/Dosha data stored in dedicated table",
      );
    } catch (error) {
      logger.warn(
        { error, clientId, category, type },
        "Failed to store raw yoga/dosha data (non-fatal)",
      );
    }
  }

  /**
   * Get all stored yogas for a client
   */
  async getStoredYogas(tenantId: string, clientId: string, system?: string) {
    return yogaDoshaRepository.findByClient(tenantId, clientId, {
      category: "yoga" as YogaDoshaCategory,
      system,
    });
  }

  /**
   * Get all stored doshas for a client
   */
  async getStoredDoshas(tenantId: string, clientId: string, system?: string) {
    return yogaDoshaRepository.findByClient(tenantId, clientId, {
      category: "dosha" as YogaDoshaCategory,
      system,
    });
  }

  /**
   * Full yoga/dosha dashboard for a client.
   * Returns all stored analysis data.
   */
  async getDashboard(tenantId: string, clientId: string, system?: string) {
    const all = await yogaDoshaRepository.findByClient(tenantId, clientId, {
      system,
    });

    const yogas = all.filter((r) => r.category === "yoga");
    const doshas = all.filter((r) => r.category === "dosha");

    return {
      yogas: {
        all: yogas,
        total: yogas.length,
      },
      doshas: {
        all: doshas,
        total: doshas.length,
      },
    };
  }
}

export const yogaDoshaService = new YogaDoshaService();

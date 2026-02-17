import { YogaDoshaCategory } from "../generated/prisma";
import { yogaDoshaRepository } from "../repositories/yoga-dosha.repository";
import { logger } from "../config/logger";

export class YogaDoshaService {
  /**
   * Extract is_present from ANY yoga/dosha JSON structure.
   * Scans all known field name patterns from the Astro Engine:
   *   - *_present (e.g. yoga_present, pitra_dosha_present, kala_sarpa_present)
   *   - has_* (e.g. has_angarak_dosha)
   *   - *_active (e.g. sade_sati_active)
   *   - present (literal boolean field)
   * Returns false if no presence field is found (safe default).
   */
  extractPresence(data: any): boolean {
    if (!data) return false;

    // Unwrap Astro Engine response wrapper: {data: actualData, cached: bool}
    const unwrapped =
      data.data && typeof data.data === "object" && "cached" in data
        ? data.data
        : data;

    /**
     * Recursive scan that ONLY returns true if it finds a positive match.
     * Returns undefined otherwise, allowing callers to keep searching other branches.
     */
    const findTruePresence = (obj: any, depth = 0): true | undefined => {
      if (!obj || typeof obj !== "object" || depth > 4) return undefined;

      const keys = Object.keys(obj);

      // Step 1: Scan all keys in this level for presence indicators
      for (const key of keys) {
        const val = obj[key];

        const isPresenceKey =
          key.endsWith("_present") ||
          key.startsWith("has_") ||
          key.endsWith("_active") ||
          key === "present" ||
          key === "is_present" ||
          key === "status";

        if (isPresenceKey) {
          // Robust check for truthy/boolean (including strings and numbers)
          if (val === true || val === 1 || val === "true" || val === "yes") return true;
        }
      }

      // Step 2: Recurse into nested objects ONLY IF no 'true' was found at this level
      for (const key of keys) {
        const val = obj[key];
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          if (findTruePresence(val, depth + 1)) return true;
        }
      }

      return undefined;
    };

    /**
     * Fallback scan that looks for ANY presence key (even false ones).
     * Only called if findTruePresence returned undefined.
     */
    const findAnyPresence = (obj: any, depth = 0): boolean | undefined => {
      if (!obj || typeof obj !== "object" || depth > 4) return undefined;

      const keys = Object.keys(obj);
      for (const key of keys) {
        const val = obj[key];
        if (
          key.endsWith("_present") ||
          key.startsWith("has_") ||
          key.endsWith("_active") ||
          key === "present" ||
          key === "is_present" ||
          key === "status"
        ) {
          // Return the value immediately (even if false) as a candidate
          if (val === true || val === 1 || val === "true" || val === "yes") return true;
          if (val === false || val === 0 || val === "false" || val === "no") return false;
        }
      }

      for (const key of keys) {
        const val = obj[key];
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          const res = findAnyPresence(val, depth + 1);
          if (res !== undefined) return res;
        }
      }

      return undefined;
    };

    // Prioritize finding a 'true' indicator anywhere in the object
    if (findTruePresence(unwrapped)) return true;

    // Last resort: find any indicator at all, or default to false
    return findAnyPresence(unwrapped) ?? false;
  }

  /**
   * Store a yoga/dosha analysis result in the dedicated table.
   * Called AFTER the existing chart save — does NOT replace it.
   * This method has its own try-catch: if it fails, the existing flow is unaffected.
   */
  async storeYogaDosha(
    tenantId: string,
    clientId: string,
    category: "yoga" | "dosha",
    type: string,
    system: string,
    analysisData: any,
  ) {
    const isPresent = this.extractPresence(analysisData);
    console.log(`[STORES] ${category.toUpperCase()} | ${type} | isPresent: ${isPresent} | Keys: ${Object.keys(analysisData || {}).join(',')}`);

    // Unwrap engine response wrapper {data: actualData, cached: bool}
    const storedData =
      analysisData?.data &&
        typeof analysisData.data === "object" &&
        "cached" in analysisData
        ? analysisData.data
        : analysisData;

    try {
      await yogaDoshaRepository.upsert(tenantId, {
        clientId,
        category: category as YogaDoshaCategory,
        type,
        isPresent,
        system,
        analysisData: storedData,
        calculatedAt: new Date(),
      });

      logger.debug(
        { clientId, category, type, isPresent, system },
        "Yoga/Dosha stored in dedicated table",
      );
    } catch (error) {
      // Non-fatal: log and continue — the existing chart save already succeeded
      logger.warn(
        { error, clientId, category, type },
        "Failed to store yoga/dosha in dedicated table (non-fatal)",
      );
    }
  }

  /**
   * Get present yogas for a client
   */
  async getPresentYogas(tenantId: string, clientId: string, system?: string) {
    return yogaDoshaRepository.findByClient(tenantId, clientId, {
      category: "yoga" as YogaDoshaCategory,
      isPresent: true,
      system,
    });
  }

  /**
   * Get present doshas for a client
   */
  async getPresentDoshas(tenantId: string, clientId: string, system?: string) {
    return yogaDoshaRepository.findByClient(tenantId, clientId, {
      category: "dosha" as YogaDoshaCategory,
      isPresent: true,
      system,
    });
  }

  /**
   * Full yoga/dosha dashboard for a client.
   * Returns all analyzed yogas/doshas with their presence status.
   */
  async getDashboard(tenantId: string, clientId: string, system?: string) {
    const all = await yogaDoshaRepository.findByClient(tenantId, clientId, {
      system,
    });

    const yogas = all.filter((r) => r.category === "yoga");
    const doshas = all.filter((r) => r.category === "dosha");

    return {
      yogas: {
        present: yogas.filter((y) => y.isPresent),
        absent: yogas.filter((y) => !y.isPresent),
        total: yogas.length,
        presentCount: yogas.filter((y) => y.isPresent).length,
      },
      doshas: {
        present: doshas.filter((d) => d.isPresent),
        absent: doshas.filter((d) => !d.isPresent),
        total: doshas.length,
        presentCount: doshas.filter((d) => d.isPresent).length,
      },
    };
  }
}

export const yogaDoshaService = new YogaDoshaService();

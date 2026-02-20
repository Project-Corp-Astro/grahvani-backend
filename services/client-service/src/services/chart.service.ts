import { chartRepository } from "../repositories/chart.repository";
import { clientRepository } from "../repositories/client.repository";
import {
  ClientNotFoundError,
  FeatureNotSupportedError,
} from "../errors/client.errors";
import { eventPublisher } from "./event.publisher";
import { activityService } from "./activity.service";
import { RequestMetadata } from "./client.service";
import { astroEngineClient } from "../clients/astro-engine.client";
import { yogaDoshaService } from "./yoga-dosha.service";
import {
  logger,
  isChartAvailable,
  AyanamsaSystem,
  SYSTEM_CAPABILITIES,
  markEndpointFailed,
  shouldSkipEndpoint,
  // clearEndpointFailure,
} from "../config";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Max concurrent DB operations for Supabase free tier (10 connections max)
const MAX_CONCURRENT_OPS = 1; // Strict limit to avoid "MaxClientsInSessionMode"

// Track background generation tasks to avoid overlaps
export const generationLocks = new Set<string>();

// Track clients that are being deleted to abort background work immediately
export const abortedClients = new Set<string>();

// Audit cooldown to avoid redundant checks (Map<clientId, lastAuditTimestamp>)
const auditCooldowns = new Map<string, number>();
const AUDIT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes (increased from 5 to reduce disk IO)

// Global generation rate limiter (prevents disk IO spikes)
let activeGenerations = 0;
const MAX_ACTIVE_GENERATIONS = 2; // Max concurrent full profile generations

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute promises in batches to avoid connection pool exhaustion
 * Optimized for Supabase free tier (limited connections)
 */
async function executeBatched<T>(
  tasks: (() => Promise<T>)[],
  batchSize = MAX_CONCURRENT_OPS,
  delayMs = 200,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    // Execute batch sequentially to be extra safe with connections
    for (const task of batch) {
      results.push(await task());
      await sleep(delayMs);
    }
  }
  return results;
}

function validateUuid(id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  return UUID_REGEX.test(id) ? id : undefined;
}

export class ChartService {
  /**
   * Save a chart for a client
   */
  async saveChart(
    tenantId: string,
    clientId: string,
    data: any,
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const validUserId = validateUuid(metadata.userId);

    const chart = await chartRepository.create(tenantId, {
      ...data,
      clientId,
      createdBy: validUserId,
    });

    // Record activity
    await activityService.recordActivity({
      tenantId,
      clientId,
      userId: validUserId,
      action: "client.chart_saved",
      details: {
        chartId: chart.id,
        type: chart.chartType,
        name: chart.chartName,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // Publish event
    await eventPublisher.publish("client.chart_saved", {
      clientId,
      tenantId,
      data: { chartId: chart.id, type: chart.chartType, name: chart.chartName },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info(
      { tenantId, clientId, chartId: chart.id },
      "Astrological chart saved",
    );

    return chart;
  }

  /**
   * Get saved charts for client
   */
  async getClientCharts(
    tenantId: string,
    clientId: string,
    _metadata?: RequestMetadata,
  ) {
    // Pre-emptive technical audit
    // Fetch charts once
    const charts = await chartRepository.findByClientId(tenantId, clientId);

    // Exclude massive deep dasha trees from bulk responses to avoid 19MB payloads
    // These can be fetched specifically via generateDasha/generateDeepDasha if needed
    const filteredCharts = charts.filter((c) => {
      if (c.chartType === ("dasha" as any)) {
        const config = c.chartConfig as any;
        if (
          config?.level === "mahadasha_to_prana" ||
          config?.level === "exhaustive_vimshottari"
        ) {
          return false;
        }
      }
      return true;
    });

    return filteredCharts;
  }

  /**
   * Delete saved chart
   */
  async deleteChart(tenantId: string, id: string, metadata: RequestMetadata) {
    const chart = await chartRepository.findById(tenantId, id);

    await chartRepository.delete(tenantId, id);

    const validUserId = validateUuid(metadata.userId);

    // Record activity
    await activityService.recordActivity({
      tenantId,
      clientId: chart?.clientId,
      userId: validUserId,
      action: "client.chart_deleted",
      details: { chartId: id },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // Publish event
    await eventPublisher.publish("client.chart_deleted", {
      clientId: chart?.clientId || "",
      tenantId,
      data: { chartId: id },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info({ tenantId, chartId: id }, "Saved chart deleted");
    return { success: true };
  }

  /**
   * Generate chart from Astro Engine and save it
   */
  async generateAndSaveChart(
    tenantId: string,
    clientId: string,
    chartType: string,
    system: AyanamsaSystem,
    metadata: RequestMetadata,
    extras?: Record<string, any>,
  ) {
    // Validate chart type is available for this system
    if (!isChartAvailable(system as AyanamsaSystem, chartType)) {
      logger.warn(
        { system, chartType, clientId },
        "Requested chart type not available for selected system",
      );
      throw new FeatureNotSupportedError(chartType, system);
    }

    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const birthData = this.prepareBirthData(client, system);

    // Call astro-engine service with Ayanamsa-aware routing
    let chartData;
    let dbChartType = chartType.toUpperCase() as any;
    const normalizedType = chartType.toLowerCase();

    if (normalizedType === "d1" || normalizedType === "natal") {
      chartData = await astroEngineClient.getNatalChart(birthData, system);
      dbChartType = "D1";
    } else if (normalizedType === "sun" || normalizedType === "sun_chart") {
      chartData = await astroEngineClient.getSunChart(birthData, system);
      dbChartType = "sun_chart";
    } else if (normalizedType === "moon" || normalizedType === "moon_chart") {
      chartData = await astroEngineClient.getMoonChart(birthData, system);
      dbChartType = "moon_chart";
    } else if (
      normalizedType === "arudha" ||
      normalizedType === "arudha_lagna"
    ) {
      chartData = await astroEngineClient.getArudhaLagna(birthData, system);
      dbChartType = "arudha_lagna";
    } else if (normalizedType === "bhava" || normalizedType === "bhava_lagna") {
      chartData = await astroEngineClient.getBhavaLagna(birthData, system);
      dbChartType = "bhava_lagna";
    } else if (normalizedType === "hora" || normalizedType === "hora_lagna") {
      chartData = await astroEngineClient.getHoraLagna(birthData, system);
      dbChartType = "hora_lagna";
    } else if (
      normalizedType === "sripathi" ||
      normalizedType === "sripathi_bhava"
    ) {
      chartData = await astroEngineClient.getSripathiBhava(birthData, system);
      dbChartType = "sripathi_bhava";
    } else if (normalizedType === "kp_bhava") {
      chartData = await astroEngineClient.getKpBhava(birthData, system);
      dbChartType = "kp_bhava";
    } else if (normalizedType === "equal_bhava") {
      chartData = await astroEngineClient.getEqualBhava(birthData, system);
      dbChartType = "equal_bhava";
    } else if (normalizedType === "equal_chart") {
      chartData = await astroEngineClient.getEqualChart(birthData, system);
      dbChartType = "equal_chart";
    } else if (normalizedType === "karkamsha") {
      // Contextual fallback: if just 'karkamsha' requested, default to D1
      chartData = await astroEngineClient.getKarkamshaD1(birthData, system);
      dbChartType = "karkamsha";
    } else if (normalizedType === "karkamsha_d1") {
      chartData = await astroEngineClient.getKarkamshaD1(birthData, system);
      dbChartType = "karkamsha_d1";
    } else if (normalizedType === "karkamsha_d9") {
      chartData = await astroEngineClient.getKarkamshaD9(birthData, system);
      dbChartType = "karkamsha_d9";
    } else if (normalizedType === "transit") {
      // For Transit (Gochar), we must use the current date/time to see live positions
      // while maintaining the natal geolocation for house calculations
      const now = new Date();
      const transitData = {
        ...birthData,
        birthDate: now.toISOString().split("T")[0],
        birthTime: now.toTimeString().split(" ")[0], // HH:MM:SS
      };
      chartData = await astroEngineClient.getTransitChart(transitData, system);

      // RETURN DIRECTLY - NO DB STORAGE for dynamic transit data
      return {
        chartType: "transit",
        chartName: `${client.fullName} - Transit (${system})`,
        chartData: chartData.data,
        chartConfig: { system },
        calculatedAt: new Date(),
        cached: chartData.cached,
        success: true,
        // Mock ID since we aren't saving
        id: "dynamic_transit_" + Date.now(),
      };
    } else if (normalizedType === "daily_transit") {
      // Daily Transit (Gochar Duration) — Lahiri-only, NO DB storage
      // Dynamic data fetched live for a date range
      const now = new Date();
      const startDate =
        extras?.transitStartDate || now.toISOString().split("T")[0];
      const endDateObj = new Date(now);
      endDateObj.setDate(endDateObj.getDate() + 7); // Default: 7 day range
      const endDate =
        extras?.transitEndDate || endDateObj.toISOString().split("T")[0];

      const dailyTransitData = {
        ...birthData,
        transitStartDate: startDate,
        transitEndDate: endDate,
      };
      const dailyData =
        await astroEngineClient.getDailyTransit(dailyTransitData);

      // Return directly — NO database save for dynamic transit data
      return {
        chartType: "daily_transit",
        chartName: `${client.fullName} - Daily Transit (Lahiri)`,
        chartData: dailyData.data,
        chartConfig: { system: "lahiri" },
        calculatedAt: new Date(),
        cached: dailyData.cached,
        success: true,
      };
    } else if (
      normalizedType === "sudarshan" ||
      normalizedType === "sudarshana"
    ) {
      chartData = await astroEngineClient.getSudarshanChakra(birthData, system);
      dbChartType = "sudarshana";
    } else if (normalizedType === "numerology_chaldean") {
      chartData = await astroEngineClient.getChaldeanNumerology({
        ...birthData,
        name: client.fullName,
      });
      dbChartType = "numerology_chaldean";
    } else if (normalizedType === "numerology_loshu") {
      chartData = await astroEngineClient.getLoShuGrid(birthData);
      dbChartType = "numerology_loshu";
    } else if (
      normalizedType.startsWith("yoga_") ||
      normalizedType.startsWith("yoga:")
    ) {
      const yogaType = normalizedType.replace("yoga_", "").replace("yoga:", "");
      chartData = await astroEngineClient.getYogaAnalysis(
        birthData,
        yogaType,
        system,
      );
      dbChartType = `yoga_${yogaType}` as any;
    } else if (
      normalizedType.startsWith("dosha_") ||
      normalizedType.startsWith("dosha:")
    ) {
      const doshaType = normalizedType
        .replace("dosha_", "")
        .replace("dosha:", "");
      chartData = await astroEngineClient.getDoshaAnalysis(
        birthData,
        doshaType,
        system,
      );
      dbChartType = `dosha_${doshaType}` as any;
    } else if (
      normalizedType.startsWith("remedy_") ||
      normalizedType.startsWith("remedy:")
    ) {
      const remedyType = normalizedType
        .replace("remedy_", "")
        .replace("remedy:", "");

      // CRITICAL FIX: Lal Kitab requires planet/house from extras
      // PLANET MUST BE TITLE CASE (e.g. "Sun", not "sun") for Python engine
      const remedyBirthData = {
        ...birthData,
        planet: this.toTitleCase(extras?.planet),
        house: extras?.house,
      };

      chartData = await astroEngineClient.getRemedy(
        remedyBirthData,
        remedyType,
        system,
      );
      // Map 'vedic' to the more specific 'remedy_vedic_remedies' database enum
      if (remedyType === "vedic" || remedyType === "vedic_remedies") {
        dbChartType = "remedy_vedic_remedies" as any;
      } else {
        dbChartType = `remedy_${remedyType}` as any;
      }
      // NOTE: Old panchanga/choghadiya/hora_times/lagna_times/muhurat handlers removed
      // Use birth_panchanga instead (universal, birth-date based) - handled in NEW INTEGRATED ROUTES section
    } else if (normalizedType === "shadbala") {
      chartData = await astroEngineClient.getShadbala(birthData, system);
      dbChartType = "shadbala";
    } else if (normalizedType === "mandi") {
      chartData = await astroEngineClient.getMandi(birthData, system);
      dbChartType = "mandi";
    } else if (normalizedType === "gulika") {
      chartData = await astroEngineClient.getGulika(birthData, system);
      dbChartType = "gulika";
    } else if (normalizedType === "d40") {
      chartData = await astroEngineClient.getD40(birthData, system);
      dbChartType = "D40";
    } else if (normalizedType === "d150" || normalizedType === "nadiamsha") {
      chartData = await astroEngineClient.getD150(birthData, system);
      dbChartType = "D150";
    } else if (normalizedType === "kp_planets_cusps") {
      // KP-specific: Planets and Cusps with sub-lords
      chartData = await astroEngineClient.getKpPlanetsCusps(birthData);
      dbChartType = "kp_planets_cusps";
    } else if (normalizedType === "kp_ruling_planets") {
      // KP-specific: Ruling Planets
      chartData = await astroEngineClient.getRulingPlanets(birthData);
      dbChartType = "kp_ruling_planets";
    } else if (normalizedType === "kp_bhava_details") {
      // KP-specific: Bhava (House) Details
      chartData = await astroEngineClient.getBhavaDetails(birthData);
      dbChartType = "kp_bhava_details";
    } else if (normalizedType === "kp_significations") {
      // KP-specific: Significations
      chartData = await astroEngineClient.getSignifications(birthData);
      dbChartType = "kp_significations";
    } else if (normalizedType === "kp_house_significations") {
      // KP-specific: House Significations (Table 1)
      chartData = await astroEngineClient.getKpHouseSignifications(birthData);
      dbChartType = "kp_house_significations";
    } else if (normalizedType === "kp_planet_significators") {
      // KP-specific: Planet Significators (Table 2 - Matrix)
      chartData = await astroEngineClient.getKpPlanetSignificators(birthData);
      dbChartType = "kp_planet_significators";
    } else if (normalizedType === "kp_interlinks") {
      chartData = await astroEngineClient.getKpInterlinks(birthData);
      dbChartType = "kp_interlinks";
    } else if (normalizedType === "kp_interlinks_advanced") {
      chartData = await astroEngineClient.getKpAdvancedInterlinks(birthData);
      dbChartType = "kp_interlinks_advanced";
    } else if (normalizedType === "kp_interlinks_sl") {
      chartData = await astroEngineClient.getKpInterlinksSL(birthData);
      dbChartType = "kp_interlinks_sl";
    } else if (normalizedType === "kp_nakshatra_nadi") {
      chartData = await astroEngineClient.getKpNakshatraNadi(birthData);
      dbChartType = "kp_nakshatra_nadi";
    } else if (normalizedType === "kp_fortuna") {
      chartData = await astroEngineClient.getKpFortuna(birthData);
      dbChartType = "kp_fortuna";
    } else if (
      normalizedType === "kp_shodasha" ||
      normalizedType === "shodasha_varga_signs" ||
      normalizedType === "shodasha_varga_summary"
    ) {
      chartData = await astroEngineClient.getShodashaVargaSummary(
        birthData,
        system,
      );
      dbChartType = "shodasha_varga_signs";
      // =========================================================================
      // NEW INTEGRATED ROUTES
      // =========================================================================
    } else if (normalizedType === "birth_panchanga") {
      // Birth panchanga uses birth date (NOT current date), stored once per client
      chartData = await astroEngineClient.getBasePanchanga(birthData);
      dbChartType = "birth_panchanga";
      // Override system to 'universal' for birth_panchanga - stored once, reused across all systems
      return {
        ...(await this.saveChart(
          tenantId,
          clientId,
          {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - Birth Panchanga`,
            chartData: chartData.data,
            chartConfig: { system: "universal" },
            calculatedAt: new Date(),
            system: "universal" as any,
          },
          metadata,
        )),
        cached: chartData.cached,
      };
    } else if (normalizedType === "choghadiya") {
      chartData = await astroEngineClient.getChoghadiya(birthData);
      dbChartType = "choghadiya";
      return {
        ...(await this.saveChart(
          tenantId,
          clientId,
          {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - Choghadiya`,
            chartData: chartData.data,
            chartConfig: { system: "universal" },
            calculatedAt: new Date(),
            system: "universal" as any,
          },
          metadata,
        )),
        cached: chartData.cached,
      };
    } else if (normalizedType === "hora_times") {
      chartData = await astroEngineClient.getHoraTimes(birthData);
      dbChartType = "hora_times";
      return {
        ...(await this.saveChart(
          tenantId,
          clientId,
          {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - Hora Times`,
            chartData: chartData.data,
            chartConfig: { system: "universal" },
            calculatedAt: new Date(),
            system: "universal" as any,
          },
          metadata,
        )),
        cached: chartData.cached,
      };
    } else if (normalizedType === "lagna_times") {
      chartData = await astroEngineClient.getLagnaTimes(birthData);
      dbChartType = "lagna_times";
      return {
        ...(await this.saveChart(
          tenantId,
          clientId,
          {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - Lagna Times`,
            chartData: chartData.data,
            chartConfig: { system: "universal" },
            calculatedAt: new Date(),
            system: "universal" as any,
          },
          metadata,
        )),
        cached: chartData.cached,
      };
    } else if (normalizedType === "muhurat") {
      chartData = await astroEngineClient.getMuhurat(birthData);
      dbChartType = "muhurat";
      return {
        ...(await this.saveChart(
          tenantId,
          clientId,
          {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - Muhurat`,
            chartData: chartData.data,
            chartConfig: { system: "universal" },
            calculatedAt: new Date(),
            system: "universal" as any,
          },
          metadata,
        )),
        cached: chartData.cached,
      };
    } else if (normalizedType === "avakhada_chakra") {
      chartData = await astroEngineClient.getAvakhada(birthData);
      dbChartType = "avakhada_chakra";
      return {
        ...(await this.saveChart(
          tenantId,
          clientId,
          {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - Avakhada Chakra`,
            chartData: chartData.data,
            chartConfig: { system: "universal" },
            calculatedAt: new Date(),
            system: "universal" as any,
          },
          metadata,
        )),
        cached: chartData.cached,
      };
    } else if (normalizedType === "gl_chart") {
      chartData = await astroEngineClient.getGlChart(birthData, system);
      dbChartType = "gl_chart";
    } else if (normalizedType === "karaka_strength") {
      chartData = await astroEngineClient.getKarakaStrength(birthData, system);
      dbChartType = "karaka_strength";
    } else if (normalizedType === "tatkalik_maitri_chakra") {
      chartData = await astroEngineClient.getTatkalikMaitriChakra(
        birthData,
        system,
      );
      dbChartType = "tatkalik_maitri_chakra";
    } else if (normalizedType === "pushkara_navamsha") {
      chartData = await astroEngineClient.getPushkaraNavamsha(birthData);
      dbChartType = "pushkara_navamsha";
    } else if (normalizedType === "yukteswar_transit") {
      chartData = await astroEngineClient.getYukteswarTransitChart(birthData);
      dbChartType = "yukteswar_transit";
    } else if (normalizedType.startsWith("yoga_")) {
      const yogaType = normalizedType.replace("yoga_", "");
      chartData = await astroEngineClient.getYogaAnalysis(
        birthData,
        yogaType,
        system,
      );
      dbChartType = normalizedType as any;
    } else if (normalizedType.startsWith("dosha_")) {
      const doshaType = normalizedType.replace("dosha_", "");
      chartData = await astroEngineClient.getDoshaAnalysis(
        birthData,
        doshaType,
        system,
      );
      dbChartType = normalizedType as any;
    } else if (normalizedType === "mandi") {
      chartData = await astroEngineClient.getMandi(birthData, system);
      dbChartType = "mandi";
    } else if (normalizedType === "gulika") {
      chartData = await astroEngineClient.getGulika(birthData, system);
      dbChartType = "gulika";
    } else {
      // Default to divisional chart generation
      chartData = await astroEngineClient.getDivisionalChart(
        birthData,
        chartType,
        system,
      );
    }

    // Save chart to database
    const chart = await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: dbChartType as any,
        chartName: `${client.fullName} - ${chartType.toUpperCase()} Chart (${system})`,
        chartData: chartData.data,
        chartConfig: { system }, // Store system for filtering
        calculatedAt: new Date(),
        system, // Explicitly pass for upsert unique constraint
      },
      metadata,
    );

    // ADDITIONALLY store yoga/dosha in dedicated table (non-destructive, fire-and-forget)
    if (dbChartType.startsWith("yoga_")) {
      const yogaType = dbChartType.replace("yoga_", "");
      yogaDoshaService.storeYogaDosha(
        tenantId,
        clientId,
        "yoga",
        yogaType,
        system,
        chartData.data,
      );
    } else if (dbChartType.startsWith("dosha_")) {
      const doshaType = dbChartType.replace("dosha_", "");
      yogaDoshaService.storeYogaDosha(
        tenantId,
        clientId,
        "dosha",
        doshaType,
        system,
        chartData.data,
      );
    }

    logger.info({ tenantId, clientId, chartType }, "Chart generated and saved");

    return {
      ...chart,
      cached: chartData.cached,
    };
  }

  /**
   * Bulk generate core charts (D1, D9) for all 3 systems
   */

  /**
   * Bulk generate core charts (D1, D9) for all included systems
   */
  async generateCoreCharts(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    const systems: AyanamsaSystem[] = ["lahiri", "raman", "kp"];
    const operations: (() => Promise<any>)[] = [];

    for (const sys of systems) {
      const vargas = sys === "kp" ? ["D1"] : ["D1", "D9"];
      for (const varga of vargas) {
        operations.push(() =>
          this.generateAndSaveChart(
            tenantId,
            clientId,
            varga,
            sys,
            metadata,
          ).catch((err) =>
            logger.error(
              { err, clientId, sys, varga },
              "Bulk generation failed for specific chart",
            ),
          ),
        );
      }
    }
    return executeBatched(operations);
  }

  /**
   * Generate full profiles for all clients in a tenant
   */
  async generateBulkCharts(tenantId: string, metadata: RequestMetadata) {
    const clients = await clientRepository.findMany(tenantId, { take: 1000 });
    const operations = clients
      .filter((client) => client.birthDate && client.birthTime)
      .map(
        (client) => () =>
          this.generateFullVedicProfile(tenantId, client.id, metadata).catch(
            (err) =>
              logger.error(
                { err, clientId: client.id },
                "Bulk complete profile failed for client",
              ),
          ),
      );

    return executeBatched(operations, 1);
  }

  async ensureFullVedicProfile(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
    targetSystem?: AyanamsaSystem,
  ): Promise<void> {
    // 1. Short-circuit if already generating
    if (generationLocks.has(clientId)) {
      return;
    }

    // 2. Throttling: Skip if audited very recently (unless targeting specific system)
    const now = Date.now();
    const lastAudit = auditCooldowns.get(clientId) || 0;
    if (!targetSystem && now - lastAudit < AUDIT_COOLDOWN_MS) {
      return;
    }

    try {
      const client = await clientRepository.findById(tenantId, clientId);
      if (!client) return;

      // STRICT ABORT: If client is being deleted (marked as failed), stop immediately
      if (
        client.generationStatus === "failed" ||
        abortedClients.has(clientId)
      ) {
        logger.info(
          { clientId },
          "🛑 AUDIT: Aborted (Client is deleting/failed)",
        );
        return;
      }

      // Update cooldown timestamp
      auditCooldowns.set(clientId, now);
      // Cleanup old entries occasionally (optional, but good for memory)
      if (auditCooldowns.size > 1000) auditCooldowns.clear();

      // 3. Define systems to check
      const systemsToCheck: AyanamsaSystem[] = targetSystem
        ? [targetSystem]
        : ["lahiri", "kp", "raman", "yukteswar"];

      // Set lock to prevent overlapping audits
      generationLocks.add(clientId);

      // 4. Parallel Background Audit (ALWAYS RUNS if not throttled)
      (async () => {
        try {
          const auditTasks = systemsToCheck.map(async (system) => {
            const missing = await this.getMissingCharts(
              tenantId,
              clientId,
              system,
            );
            if (missing.length > 0) {
              logger.debug(
                { clientId, system, missingCount: missing.length },
                "🚑 AUDIT: Missing charts detected",
              );
              // Trigger specific system generation in background
              await this.generateSystemProfile(
                tenantId,
                clientId,
                system,
                metadata,
              ).catch((err) => {
                logger.error(
                  { err: err.message, clientId, system },
                  "❌ Background auto-healing failed",
                );
              });
            }
          });

          await Promise.allSettled(auditTasks);

          // 5. Audit UNIVERSAL charts (Panchanga, etc)
          const missingUniversal = await this.getMissingCharts(
            tenantId,
            clientId,
            "universal" as any,
          );
          if (missingUniversal.length > 0) {
            logger.info(
              { clientId, missingCount: missingUniversal.length },
              "🚑 AUDIT: Missing universal charts detected",
            );
            // Use any existing system (e.g. lahiri) to drive the generation as these methods handle 'universal' internally
            await this.generateMissingCharts(
              tenantId,
              clientId,
              missingUniversal,
              "lahiri",
              metadata,
            ).catch((err) => {
              logger.error(
                { err: err.message, clientId },
                "❌ Background universal auto-healing failed",
              );
            });
          }

          // Final sync: if nothing was missing but status is off, fix it
          if (!targetSystem) {
            const finalClient = await clientRepository.findById(
              tenantId,
              clientId,
            );
            if (finalClient && finalClient.generationStatus !== "completed") {
              await clientRepository.update(tenantId, clientId, {
                generationStatus: "completed",
                chartsVersion: 2,
              } as any);
            }
          }
        } finally {
          generationLocks.delete(clientId);
        }
      })().catch((err) => {
        logger.error(
          { err: err.message, clientId },
          "Background audit failure",
        );
        generationLocks.delete(clientId);
      });
    } catch (error) {
      logger.error({ error, clientId }, "Error during profile audit launch");
    }
  }

  /**
   * STARTUP RECOVERY: Resumes interrupted generations.
   * Finds clients stuck in 'processing' state (likely due to server crash)
   * and re-triggers their self-healing check.
   * Run this ONCE on server startup.
   */
  async resumeInterruptedGenerations() {
    try {
      logger.info("🔄 RECOVERY: Scanning for interrupted chart generations...");

      // 1. Find clients stuck in 'processing' state via system query
      const stuckClients = await clientRepository.findProcessingClients(50);

      if (stuckClients.length === 0) {
        logger.info("✅ RECOVERY: No interrupted generations found.");
        return;
      }

      logger.info(
        { count: stuckClients.length },
        "⚠️ RECOVERY: Found stuck clients - triggering auto-heal",
      );

      // 2. Trigger auto-heal for each (Fire-and-Forget batch)
      const operations = stuckClients.map((client) => async () => {
        // Must explicitly cast or ensure tenantId is present on the client object
        const tenantId = client.tenantId;
        if (!tenantId) {
          logger.warn(
            { clientId: client.id },
            "RECOVERY: Skipping client with missing tenantId",
          );
          return;
        }

        const metadata: RequestMetadata = {
          userId: "SYSTEM_RECOVERY",
          ipAddress: "127.0.0.1",
          userAgent: "Backend/StartupScript",
        };

        logger.info(
          { clientId: client.id },
          "🚑 RECOVERY: Resuming generation for client",
        );
        // Force check all systems
        await this.ensureFullVedicProfile(tenantId, client.id, metadata);
      });

      // Execute with concurrency limit to be safe
      await executeBatched(operations, 5, 100);

      logger.info("✅ RECOVERY: Batch processing initiated.");
    } catch (err: any) {
      logger.error({ err: err.message }, "❌ Start-up recovery failed");
    }
  }

  // WAIT. Let's look at `ChartService` properties. Does it have `prisma`?
  // Step 177 view shows `import { clientRepository }` but not `this.prisma`.
  // It seems `ChartService` methods use `clientRepository`.

  // ACTION: I will execute a "Task Boundary" to view `ClientRepository` availability.
  // I need to see if I can run a cross-tenant query.
  // Recovering...

  async generateFullVedicProfile(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ): Promise<any> {
    if (generationLocks.has(clientId)) {
      logger.debug({ clientId }, "⚠️ GENERATION: Already locked, exiting");
      return { status: "already_processing" };
    }

    // Global rate limiting to prevent disk IO spikes
    if (activeGenerations >= MAX_ACTIVE_GENERATIONS) {
      logger.warn(
        { clientId, activeGenerations },
        "⚠️ GENERATION: Rate limited, too many active generations",
      );
      return {
        status: "rate_limited",
        message: "Server busy, try again later",
      };
    }

    generationLocks.add(clientId);
    activeGenerations++;
    const startTime = Date.now();
    logger.info(
      { clientId, activeGenerations },
      "🔒 GENERATION: Orchestrating Parallel Multi-System Profile",
    );

    try {
      const client = await clientRepository.findById(tenantId, clientId);
      if (!client) throw new Error("Client not found");

      // STRICT ABORT: If client is being deleted (marked as failed), stop immediately
      if (
        client.generationStatus === "failed" ||
        abortedClients.has(clientId)
      ) {
        logger.info(
          { clientId },
          "🛑 GENERATION: Aborted (Client is deleting/failed)",
        );
        return { status: "aborted" };
      }

      // 1. Initial State Update
      await clientRepository.update(tenantId, clientId, {
        generationStatus: "processing",
      } as any);

      // 1.5. UNIVERSAL CHARTS: Generate panchanga types once (not per-system)
      // These are all based on birth date/time and are system-agnostic
      const universalChartTypes = [
        "birth_panchanga",
        "choghadiya",
        "hora_times",
        "lagna_times",
        "muhurat",
      ];
      for (const chartType of universalChartTypes) {
        try {
          logger.info(
            { clientId, chartType },
            `📅 Generating ${chartType} (universal)`,
          );
          await this.generateAndSaveChart(
            tenantId,
            clientId,
            chartType,
            "lahiri" as any,
            metadata,
          );
        } catch (err: any) {
          // Non-fatal: Log but continue with other charts
          logger.error(
            { err: err.message, clientId, chartType },
            `⚠️ ${chartType} failed (non-fatal)`,
          );
        }
      }

      const ayanamsas: AyanamsaSystem[] = [
        "lahiri",
        "kp",
        "raman",
        "yukteswar",
      ];

      // 2. Sequential-Parallel Orchestration
      // To prevent connection pool exhaustion, we run 2 systems at a time
      const batch1 = ayanamsas.slice(0, 2);
      const batch2 = ayanamsas.slice(2, 4);

      const results: any = {};

      for (const batch of [batch1, batch2]) {
        const outcomes = await Promise.allSettled(
          batch.map((system) =>
            this.generateSystemProfile(tenantId, clientId, system, metadata),
          ),
        );

        batch.forEach((system, index) => {
          const outcome = outcomes[index];
          if (outcome.status === "fulfilled") {
            results[system] = outcome.value;
          } else {
            logger.error(
              { system, err: outcome.reason, clientId },
              "❌ System generation failed",
            );
            results[system] = { status: "failed", error: outcome.reason };
          }
        });
      }

      // 3. Final State Update
      await clientRepository.update(tenantId, clientId, {
        generationStatus: "completed",
        chartsVersion: 2,
      } as any);

      const duration = Date.now() - startTime;
      logger.info(
        { clientId, duration },
        "✅ Full Vedic Profile orchestrated finished (Parallel)",
      );

      return { status: "success", duration, results };
    } catch (error: any) {
      logger.error(
        { error: error.message, clientId },
        "Vedic Profile orchestration failed",
      );
      await clientRepository.update(tenantId, clientId, {
        generationStatus: "failed",
      } as any);
      throw error;
    } finally {
      generationLocks.delete(clientId);
      activeGenerations = Math.max(0, activeGenerations - 1);
    }
  }

  /**
   * Generate profile for a SINGLE system (Isolated & Resilient)
   */
  async generateSystemProfile(
    tenantId: string,
    clientId: string,
    system: AyanamsaSystem,
    metadata: RequestMetadata,
  ) {
    const missing = await this.getMissingCharts(tenantId, clientId, system);

    if (missing.length > 0) {
      logger.debug(
        { system, missingCount: missing.length, clientId },
        `🔧 GENERATING [${system.toUpperCase()}]`,
      );
      // Batch within a system is still safe to avoid connection spikes,
      // but multiple systems now run their batches in parallel.
      await this.generateMissingCharts(
        tenantId,
        clientId,
        missing,
        system,
        metadata,
      );
    } else {
      logger.debug(
        { system, clientId },
        `✅ [${system.toUpperCase()}] Already complete`,
      );
    }

    return { missingCount: missing.length, status: "success" };
  }

  /**
   * Generate only specific missing charts (more efficient than full regeneration)
   * Uses endpoint failure tracking to skip known-failing endpoints
   */
  private async generateMissingCharts(
    tenantId: string,
    clientId: string,
    missingCharts: string[],
    system: AyanamsaSystem,
    metadata: RequestMetadata,
  ) {
    const operations: (() => Promise<any>)[] = [];

    for (const chartType of missingCharts) {
      const lowerType = chartType.toLowerCase();

      // ABORT CHECK: If client was deleted (lock removed or aborted flag set)
      if (!generationLocks.has(clientId) || abortedClients.has(clientId)) {
        logger.info(
          { clientId, system },
          "🛑 GENERATION: Aborted (Client likely deleted)",
        );
        return;
      }

      // Skip endpoints that have recently failed
      if (shouldSkipEndpoint(system, chartType)) {
        logger.debug(
          { system, chartType },
          "Skipping previously failed endpoint",
        );
        continue;
      }

      // DOUBLE CHECK: Validate chart is still applicable (in case of cached old missing list)
      if (!isChartAvailable(system, chartType)) {
        logger.debug(
          { system, chartType },
          "Skipping inapplicable chart for system",
        );
        continue;
      }

      if (lowerType.startsWith("ashtakavarga_")) {
        const type = lowerType.replace("ashtakavarga_", "") as
          | "sarva"
          | "bhinna"
          | "shodasha";
        operations.push(() =>
          this.generateAndSaveAshtakavarga(
            tenantId,
            clientId,
            type,
            system,
            metadata,
          ).catch((err) => {
            if (err?.statusCode === 404 || err?.statusCode === 500) {
              markEndpointFailed(system, chartType);
            }
            logger.warn(
              { clientId, chartType, system },
              "Chart generation failed - endpoint marked",
            );
          }),
        );
      } else if (lowerType === "sudarshana" || lowerType === "sudarshan") {
        operations.push(() =>
          this.generateAndSaveSudarshanChakra(
            tenantId,
            clientId,
            system,
            metadata,
          ).catch((err) => {
            if (err?.statusCode === 404 || err?.statusCode === 500) {
              markEndpointFailed(system, chartType);
            }
            logger.warn(
              { clientId, chartType, system },
              "Chart generation failed - endpoint marked",
            );
          }),
        );
      } else if (lowerType === "dasha" && system !== "kp") {
        // 'dasha' is specifically for Raw Prana Vimshottari (Lahiri/Raman)
        operations.push(() =>
          this.generateDeepDasha(tenantId, clientId, system, metadata).catch(
            (err) => {
              if (err?.statusCode === 404 || err?.statusCode === 500) {
                markEndpointFailed(system, chartType);
              }
              logger.warn(
                { clientId, chartType, system },
                "Background deep dasha generation failed",
              );
            },
          ),
        );
      } else if (lowerType === "dasha_vimshottari") {
        // 'dasha_vimshottari' is for UI-optimized Tree
        operations.push(() =>
          this.generateDasha(tenantId, clientId, "tree", system, {}).catch(
            (err) => {
              if (err?.statusCode === 404 || err?.statusCode === 500) {
                markEndpointFailed(system, chartType);
              }
              logger.warn(
                { clientId, chartType, system },
                "Background tree dasha generation failed",
              );
            },
          ),
        );
      } else if (lowerType.startsWith("dasha_")) {
        // Correctly route dasha_tribhagi etc to generateAlternativeDasha
        const dashaName = lowerType.replace("dasha_", "");
        operations.push(() =>
          this.generateAlternativeDasha(
            tenantId,
            clientId,
            dashaName,
            system,
            "mahadasha",
            {},
            true,
            metadata,
          ).catch((err) => {
            if (err?.statusCode === 404 || err?.statusCode === 500) {
              markEndpointFailed(system, chartType);
            }
            logger.warn(
              { clientId, chartType, system },
              "Background alternative dasha generation failed",
            );
          }),
        );
      } else if (lowerType === "dasha_summary") {
        // Correctly route dasha_summary to internal logic
        operations.push(() =>
          this.generateDashaSummary(tenantId, clientId, system, metadata).catch(
            (err) => {
              logger.warn(
                { clientId, system, err: err.message },
                "Background dasha summary failed",
              );
            },
          ),
        );
      } else if (lowerType.startsWith("kp_")) {
        // Specialized KP methods
        const methodMap: Record<string, string> = {
          kp_planets_cusps: "getKpPlanetsCusps",
          kp_ruling_planets: "getKpRulingPlanets",
          kp_bhava_details: "getKpBhavaDetails",
          kp_significations: "getKpSignifications",
          kp_house_significations: "getKpHouseSignifications",
          kp_planet_significators: "getKpPlanetSignificators",
          kp_interlinks: "getKpInterlinks",
          kp_interlinks_advanced: "getKpAdvancedInterlinks",
          kp_interlinks_sl: "getKpInterlinksSL",
          kp_nakshatra_nadi: "getKpNakshatraNadi",
          kp_fortuna: "getKpFortuna",
          kp_shodasha: "generateAndSaveChart", // Use router for this
        };
        const methodName = methodMap[lowerType];
        if (methodName) {
          const task =
            (this as any)[methodName] === this.generateAndSaveChart
              ? () =>
                this.generateAndSaveChart(
                  tenantId,
                  clientId,
                  chartType,
                  system,
                  metadata,
                )
              : () => (this as any)[methodName](tenantId, clientId, metadata);

          operations.push(() =>
            task().catch((err: any) => {
              logger.warn(
                { err: err.message, clientId, chartType },
                "KP chart generation failed",
              );
              if (err?.statusCode === 404 || err?.statusCode === 500)
                markEndpointFailed(system, chartType);
            }),
          );
        } else {
          // Fallback to general router for any KP charts not in map
          operations.push(() =>
            this.generateAndSaveChart(
              tenantId,
              clientId,
              chartType,
              system,
              metadata,
            ).catch((err: any) => {
              logger.warn(
                { err: err.message, clientId, chartType },
                "KP chart generation fallback failed",
              );
              if (err?.statusCode === 404 || err?.statusCode === 500)
                markEndpointFailed(system, chartType);
            }),
          );
        }
      } else {
        // Default CATCH-ALL for:
        // 1. Divisional Charts (D1...D60)
        // 2. Special Charts (moon, sun, etc)
        // 3. Yogas (yoga_*)
        // 4. Doshas (dosha_*)
        // 5. Remedies (remedy_*)
        // 6. Panchanga (panchanga, hora, etc)
        // The generateAndSaveChart method handles routing based on prefix/type.
        operations.push(() =>
          this.generateAndSaveChart(
            tenantId,
            clientId,
            chartType,
            system,
            metadata,
          ).catch((err) => {
            if (err?.statusCode === 404 || err?.statusCode === 500) {
              markEndpointFailed(system, chartType);
            }
            logger.warn(
              { clientId, chartType, system },
              "Chart generation failed - endpoint marked",
            );
          }),
        );
      }
    }

    if (operations.length === 0) {
      logger.debug(
        { clientId, system },
        "No chart operations to run (all endpoints skipped or no missing charts)",
      );
      return [];
    }

    return executeBatched(operations, 2);
  }

  /**
   * Generate dasha periods for a client (Ayanamsa-aware)
   */
  async generateDasha(
    tenantId: string,
    clientId: string,
    level: string = "mahadasha",
    ayanamsa: AyanamsaSystem = "lahiri",
    options: any = {},
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const birthData = this.prepareBirthData(client, ayanamsa);

    // DB-FIRST: Check if this EXACT dasha already exists in database (High Performance)
    const matchingDasha = await chartRepository.findOneByTypeAndSystem(
      tenantId,
      clientId,
      "dasha_vimshottari",
      ayanamsa,
    );

    if (matchingDasha && (matchingDasha.chartConfig as any)?.level === level) {
      logger.info(
        { clientId, level, ayanamsa },
        "Dasha found in database - returning raw stored data",
      );
      return {
        clientId,
        clientName: client.fullName,
        level,
        ayanamsa,
        data: matchingDasha.chartData,
        cached: true,
        calculatedAt: matchingDasha.calculatedAt,
      };
    }

    // ENGINE CALL: Fetch raw data from Python engine
    let dashaResponse: any;
    if (level === "tree" || level === "prana_raw") {
      logger.info(
        { clientId, ayanamsa },
        "Fetching full Prana Dasha (raw) from engine",
      );
      dashaResponse = await astroEngineClient.getPranaDasha(
        birthData,
        ayanamsa,
      );
    } else {
      logger.info(
        { clientId, ayanamsa, level },
        "Fetching level-specific dasha from engine",
      );
      dashaResponse = await astroEngineClient.getVimshottariDasha(
        birthData,
        level,
        options,
      );
    }

    // Use the raw data from response
    const finalData = dashaResponse.data || dashaResponse;

    const result = {
      clientId,
      clientName: client.fullName,
      level,
      ayanamsa,
      data: finalData,
      cached: dashaResponse.cached,
      calculatedAt: dashaResponse.calculatedAt || new Date().toISOString(),
    };

    // AUTO-SAVE: Store the EXACT data from engine in DB
    // unless it's a very specific drill-down (to avoid polluting DB with millions of small branches)
    // However, per user requirement "We need to store exactly whatever is coming from the Python engine"
    if (
      level === "tree" ||
      level === "mahadasha" ||
      level === "prana_raw" ||
      !options.mahaLord
    ) {
      await this.saveChart(
        tenantId,
        clientId,
        {
          chartType: "dasha_vimshottari",
          chartName: `${client.fullName} - ${level} Vimshottari (${ayanamsa})`,
          chartData: finalData,
          chartConfig: { system: ayanamsa, level, dashaType: "vimshottari" },
          calculatedAt: new Date(),
          system: ayanamsa,
        },
        { userId: "system" } as any,
      );
    }

    logger.info(
      { tenantId, clientId, level, ayanamsa },
      "Dasha raw data stored and returned",
    );

    return result;
  }

  /**
   * Map dasha type string to database enum
   * Handles input normalization from various sources (frontend, engine)
   */
  private getDashaChartType(dashaType: string): any {
    const type = dashaType.toLowerCase().replace(/-/g, "_"); // Normalize hyphens to underscores

    const mapping: Record<string, string> = {
      // Vimshottari variants
      vimshottari: "dasha_vimshottari",
      mahaantar: "dasha_vimshottari",

      // Standard dashas
      chara: "dasha_chara",
      yogini: "dasha_yogini",

      // Ashtottari variants (all map to base)
      ashtottari: "dasha_ashtottari",
      ashtottari_antar: "dasha_ashtottari",
      ashtottari_pratyantardasha: "dasha_ashtottari",
      ashtottari_pratyantardashas: "dasha_ashtottari",

      // Tribhagi variants
      tribhagi: "dasha_tribhagi",
      tribhagi_40: "dasha_tribhagi_40",

      // Other dasha systems
      shodashottari: "dasha_shodashottari",
      dwadashottari: "dasha_dwadashottari",
      panchottari: "dasha_panchottari",
      chaturshitisama: "dasha_chaturshitisama",
      satabdika: "dasha_satabdika",
      dwisaptati: "dasha_dwisaptati",
      dwisaptatisama: "dasha_dwisaptati",
      shastihayani: "dasha_shastihayani",
      shattrimshatsama: "dasha_shattrimshatsama",

      // Report types
      dasha_3months: "dasha_3months",
      dasha_6months: "dasha_6months",
      dasha_report_1year: "dasha_report_1year",
      dasha_report_2years: "dasha_report_2years",
      dasha_report_3years: "dasha_report_3years",
    };
    return mapping[type] || "dasha";
  }

  /**
   * Generate dasha and optionally save to database
   */
  async generateAndSaveDasha(
    tenantId: string,
    clientId: string,
    level: string = "mahadasha",
    ayanamsa: AyanamsaSystem = "lahiri",
    options: {
      mahaLord?: string;
      antarLord?: string;
      pratyantarLord?: string;
      sookshmaLord?: string;
    } = {},
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const dashaResult = await this.generateDasha(
      tenantId,
      clientId,
      level,
      ayanamsa,
      options,
    );
    // const dbChartType = this.getDashaChartType("vimshottari");

    const chart = await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: "dasha_vimshottari",
        chartName: `${client.fullName} - ${level} Vimshottari Dasha (${ayanamsa})`,
        chartData: dashaResult.data,
        chartConfig: { system: ayanamsa, level, dashaType: "vimshottari" },
        calculatedAt: new Date(),
        system: ayanamsa,
      },
      metadata,
    );

    return {
      ...chart,
      data: chart.chartData,
      cached: dashaResult.cached,
      clientName: client.fullName,
    };
  }

  /**
   * Generate Alternative Dasha Systems
   */
  async generateAlternativeDasha(
    tenantId: string,
    clientId: string,
    dashaType: string,
    ayanamsa: AyanamsaSystem = "lahiri",
    level: string = "mahadasha",
    options: {
      mahaLord?: string;
      antarLord?: string;
      pratyantarLord?: string;
    } = {},
    _save: boolean = false,
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    // VALIDATION: Ensure dasha type is actually supported for this system
    // This prevents invalid calls (like Tribhagi for Raman) from reaching Astro Engine
    const capabilities = SYSTEM_CAPABILITIES[ayanamsa];
    const normalizedType = dashaType.toLowerCase().replace(/-dasha$/, "");

    const isSupported = capabilities?.dashas?.some(
      (d) =>
        d.toLowerCase() === normalizedType ||
        d.toLowerCase() === dashaType.toLowerCase(),
    );

    if (!isSupported) {
      logger.warn(
        {
          clientId,
          ayanamsa,
          dashaType,
          supported: capabilities?.dashas,
        },
        "🛑 Blocked unsupported dasha generation attempt",
      );

      throw new FeatureNotSupportedError(dashaType, ayanamsa);
    }

    const birthData = this.prepareBirthData(client, ayanamsa);

    const dashaData = await astroEngineClient.getOtherDasha(
      birthData,
      dashaType,
      ayanamsa,
      options,
    );

    // ALWAYS SAVE/OVERWRITE: Store exact data from astro engine as requested
    const dbChartType = this.getDashaChartType(dashaType);
    const chart = await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: dbChartType,
        chartName: `${client.fullName} - ${dashaType.replace("-", " ")} (${ayanamsa})`,
        chartData: dashaData.data,
        chartConfig: { system: ayanamsa, dashaType, level },
        calculatedAt: new Date(),
        system: ayanamsa,
      },
      metadata,
    );

    return {
      ...chart,
      data: chart.chartData,
      clientName: client.fullName,
      ayanamsa,
      cached: dashaData.cached,
    };
  }

  /**
   * Generate Raw 5-level Dasha (Prana) from Astro Engine
   */
  async generateDeepDasha(
    tenantId: string,
    clientId: string,
    ayanamsa: AyanamsaSystem = "lahiri",
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const birthData = this.prepareBirthData(client, ayanamsa);

    const dashaResult = await astroEngineClient.getPranaDasha(
      birthData,
      ayanamsa,
    );
    const finalData = dashaResult.data || dashaResult;

    const chart = await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: "dasha", // Use 'dasha' for Raw Deep Prana
        chartName: `Raw Prana Dasha (${ayanamsa})`,
        chartData: finalData,
        chartConfig: {
          system: ayanamsa,
          level: "prana_raw",
          dashaType: "vimshottari",
        },
        calculatedAt: new Date(),
        system: ayanamsa,
      },
      metadata,
    );

    return { ...chart, data: finalData };
  }

  private findCurrentDasha(periods: any[]): any {
    if (!Array.isArray(periods) || periods.length === 0) return null;
    const now = new Date();
    const current = periods.find((p) => {
      const start = new Date(p.start_date || p.startDate);
      const end = new Date(p.end_date || p.endDate);
      return now >= start && now <= end;
    });
    if (!current) return null;
    if (current.sublevels && Array.isArray(current.sublevels)) {
      const activeSub = this.findCurrentDasha(current.sublevels);
      if (activeSub) return activeSub;
    }
    return current;
  }

  private extractDashaPath(periods: any[]): string[] {
    const path: string[] = [];
    let currentLevel = periods;
    while (currentLevel) {
      const active = this.findCurrentDasha(currentLevel);
      if (!active) break;
      path.push(active.planet || active.lord || active.sign);
      currentLevel = active.sublevels || null;
    }
    return path;
  }

  private calculateDashaProgress(period: any): number {
    const start = new Date(period.start_date || period.startDate).getTime();
    const end = new Date(period.end_date || period.endDate).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  /**
   * Generate consolidated summary of active periods
   */
  async generateDashaSummary(
    tenantId: string,
    clientId: string,
    ayanamsa: AyanamsaSystem,
    metadata: RequestMetadata,
  ): Promise<void> {
    const charts = await chartRepository.findByClientId(tenantId, clientId);
    const dashaCharts = charts.filter(
      (c) =>
        c.chartType.toString().startsWith("dasha_") &&
        (c as any).system === ayanamsa,
    );

    const analysis: any = {
      activeDashas: {},
      calculatedAt: new Date(),
      system: ayanamsa,
    };

    for (const chart of dashaCharts) {
      const data = chart.chartData as any;
      const periods =
        data.dasha_list ||
        (Array.isArray(data) ? data : data.periods || data.mahadashas || []);
      const current = this.findCurrentDasha(periods);

      if (current) {
        const systemName = chart.chartType.toString().replace("dasha_", "");
        analysis.activeDashas[systemName] = {
          period: current.planet || current.lord || current.sign,
          fullPath: this.extractDashaPath(periods),
          startDate: current.start_date || current.startDate,
          endDate: current.end_date || current.endDate,
          progress: this.calculateDashaProgress(current),
        };
      }
    }

    await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: "dasha_summary",
        chartName: `Active Dasha Analysis (${ayanamsa})`,
        chartData: analysis,
        chartConfig: { system: ayanamsa, analyzed: true },
        calculatedAt: new Date(),
        system: ayanamsa,
      },
      metadata,
    );
  }

  /**
   * Generate Ashtakavarga for a client (Lahiri/Raman only)
   * This returns Bhinna Ashtakavarga (individual planet scores)
   */
  async generateAshtakavarga(
    tenantId: string,
    clientId: string,
    type:
      | "bhinna"
      | "sarva"
      | "shodasha"
      | "sarva_ashtakavarga_chart"
      | "binnashtakvarga_chart" = "bhinna",
    ayanamsa: AyanamsaSystem = "lahiri",
  ) {
    if (ayanamsa === "kp") {
      throw new Error("Ashtakavarga is not available for KP system");
    }

    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const birthData = this.prepareBirthData(client, ayanamsa);

    let result;
    if (type === "sarva") {
      result = await astroEngineClient.getSarvaAshtakavarga(
        birthData,
        ayanamsa,
      );
    } else if (type === "shodasha") {
      result = await astroEngineClient.getShodashaVarga(birthData, ayanamsa);
    } else {
      result = await astroEngineClient.getAshtakavarga(birthData, ayanamsa);
    }

    logger.info(
      { tenantId, clientId, ayanamsa, type },
      "Ashtakavarga calculated",
    );

    return {
      clientId,
      clientName: client.fullName,
      ayanamsa,
      type,
      data: result.data,
      cached: result.cached,
      calculatedAt: result.calculatedAt,
    };
  }

  /**
   * Generate and save Ashtakavarga
   */
  async generateAndSaveAshtakavarga(
    tenantId: string,
    clientId: string,
    type:
      | "bhinna"
      | "sarva"
      | "shodasha"
      | "sarva_ashtakavarga_chart"
      | "binnashtakvarga_chart" = "bhinna",
    ayanamsa: AyanamsaSystem = "lahiri",
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const result = await this.generateAshtakavarga(
      tenantId,
      clientId,
      type,
      ayanamsa,
    );

    const chartTypeMap = {
      bhinna: "ashtakavarga_bhinna",
      sarva: "ashtakavarga_sarva",
      shodasha: "ashtakavarga_shodasha",
      sarva_ashtakavarga_chart: "ashtakavarga_sarva",
      binnashtakvarga_chart: "ashtakavarga_bhinna",
    } as const;

    const chart = await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: chartTypeMap[type] || "ashtakavarga_bhinna",
        chartName: `${client.fullName} - ${type.toUpperCase()} Ashtakavarga (${ayanamsa})`,
        chartData: result.data,
        chartConfig: { system: ayanamsa, type },
        calculatedAt: new Date(),
        system: ayanamsa, // Explicitly pass for upsert
      },
      metadata,
    );

    return {
      ...chart,
      data: chart.chartData, // Map for frontend
      cached: result.cached,
      clientName: client.fullName,
    };
  }

  /**
   * Generate Sudarshan Chakra for a client
   */
  async generateSudarshanChakra(
    tenantId: string,
    clientId: string,
    ayanamsa: AyanamsaSystem = "lahiri",
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const birthData = this.prepareBirthData(client, ayanamsa);

    const chakraData = await astroEngineClient.getSudarshanChakra(
      birthData,
      ayanamsa,
    );

    logger.info({ tenantId, clientId, ayanamsa }, "Sudarshan Chakra generated");

    return {
      clientId,
      clientName: client.fullName,
      ayanamsa,
      data: chakraData.data,
      cached: chakraData.cached,
      calculatedAt: chakraData.calculatedAt,
    };
  }

  /**
   * Generate and save Sudarshan Chakra
   */
  async generateAndSaveSudarshanChakra(
    tenantId: string,
    clientId: string,
    ayanamsa: AyanamsaSystem = "lahiri",
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const result = await this.generateSudarshanChakra(
      tenantId,
      clientId,
      ayanamsa,
    );

    try {
      const chart = await this.saveChart(
        tenantId,
        clientId,
        {
          chartType: "sudarshana", // Matches enum in schema
          chartName: `${client.fullName} - Sudarshan Chakra (${ayanamsa})`,
          chartData: result.data,
          chartConfig: { system: ayanamsa },
          calculatedAt: new Date(),
          system: ayanamsa, // Explicitly pass for upsert
        },
        metadata,
      );

      return {
        ...chart,
        data: chart.chartData, // Map for frontend consistency
        cached: result.cached,
        clientName: client.fullName,
      };
    } catch (error: any) {
      logger.error(
        {
          err: error,
          code: error.code,
          meta: error.meta,
          clientId,
          tenantId,
        },
        "Failed to save Sudarshan Chakra chart",
      );
      throw error;
    }
  }

  /**
   * Extract time string from various time value formats
   * Handles PostgreSQL Time type, Date objects, and raw strings
   */
  private extractTimeString(
    timeValue: Date | string | null | undefined,
  ): string {
    if (!timeValue) return "12:00:00";

    if (typeof timeValue === "string") {
      const segments = timeValue.split(":");
      if (segments.length === 2) return `${timeValue}:00`;
      if (segments.length === 1) return `${timeValue.padStart(2, "0")}:00:00`;
      return timeValue;
    }

    // CRITICAL FIX: prismaData.birthTime is saved using setUTCHours in ClientService.
    // We MUST use getUTC* methods to avoid server-local timezone shifts.
    const hours = timeValue.getUTCHours().toString().padStart(2, "0");
    const mins = timeValue.getUTCMinutes().toString().padStart(2, "0");
    const secs = timeValue.getUTCSeconds().toString().padStart(2, "0");
    return `${hours}:${mins}:${secs}`;
  }

  /**
   * Parse timezone string to offset number
   */
  private parseTimezoneOffset(timezone: string | null): number {
    if (!timezone) return 5.5; // Default to IST if missing

    // 1. Common Indian Standard Time check (Performance Optimization)
    if (
      timezone.includes("Kolkata") ||
      timezone === "IST" ||
      timezone === "Asia/Calcutta"
    ) {
      return 5.5;
    }

    // 2. Explicit Offset check (+05:30, -04:00)
    const offsetMatch = timezone.match(/([+-])(\d{1,2}):(\d{2})/);
    if (offsetMatch) {
      const hours = parseInt(offsetMatch[2]);
      const minutes = parseInt(offsetMatch[3]) / 60;
      return offsetMatch[1] === "-" ? -(hours + minutes) : hours + minutes;
    }

    // 3. IANA Timezone Resolution (America/New_York, etc.)
    // Uses Node's built-in ICU data for accurate historical offsets
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "longOffset",
      }).formatToParts(new Date());

      const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value; // e.g., "GMT-04:00"
      if (offsetPart) {
        const match = offsetPart.match(/GMT([+-])(\d{2}):(\d{2})/);
        if (match) {
          const hours = parseInt(match[2]);
          const minutes = parseInt(match[3]) / 60;
          const sign = match[1] === "-" ? -1 : 1;
          return sign * (hours + minutes);
        }
      }
    } catch (err) {
      logger.warn(
        { timezone, err },
        "Failed to parse IANA timezone name. Falling back to IST 5.5",
      );
    }

    return 5.5;
  }

  /**
   * Centralized builder for Astro Engine birth data.
   * Ensures all fields (including userName) are consistently mapped.
   */
  private prepareBirthData(
    client: any,
    ayanamsa: AyanamsaSystem = "lahiri",
  ): any {
    if (!client.birthDate) {
      throw new Error("Incomplete client birth details");
    }

    return {
      birthDate: client.birthDate.toISOString().split("T")[0],
      birthTime: this.extractTimeString(client.birthTime),
      latitude: Number(client.birthLatitude || 0),
      longitude: Number(client.birthLongitude || 0),
      timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
      timezone: client.birthTimezone || "UTC",
      userName: client.fullName || client.name || "Anonymous",
      ayanamsa: ayanamsa, // FIXED: Use 'ayanamsa' field, not 'system'
    };
  }

  // =========================================================================
  // KP (KRISHNAMURTI PADDHATI) SYSTEM METHODS
  // =========================================================================

  /**
   * Get KP Planets and Cusps with sub-lords
   */
  async getKpPlanetsCusps(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_planets_cusps",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Ruling Planets
   */
  async getKpRulingPlanets(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_ruling_planets",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Bhava Details
   */
  async getKpBhavaDetails(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_bhava_details",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Significations
   */
  async getKpSignifications(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_significations",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP House Significations
   */
  async getKpHouseSignifications(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_house_significations",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Planet Significators
   */
  async getKpPlanetSignificators(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_planet_significators",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Interlinks
   */
  async getKpInterlinks(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_interlinks",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Advanced Interlinks
   */
  async getKpAdvancedInterlinks(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_interlinks_advanced",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Interlinks (Sub-Lord)
   */
  async getKpInterlinksSL(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_interlinks_sl",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Nakshatra Nadi
   */
  async getKpNakshatraNadi(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_nakshatra_nadi",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Fortuna
   */
  async getKpFortuna(
    tenantId: string,
    clientId: string,
    metadata: RequestMetadata,
  ) {
    return this.generateAndSaveChart(
      tenantId,
      clientId,
      "kp_fortuna",
      "kp",
      metadata,
    );
  }

  /**
   * Get KP Horary (Prashna) Analysis
   */
  async getKpHorary(
    tenantId: string,
    clientId: string,
    horaryNumber: number,
    question: string,
    metadata: RequestMetadata,
  ) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    // Horary is unique per question/time.
    // Mapped to 'muhurat' (System: kp) - Semantically "Time Selection / Query"

    const birthData = this.prepareBirthData(client, "kp");
    const result = await astroEngineClient.getKpHorary({
      ...birthData,
      horaryNumber,
      question,
    });

    // Save Horary Result. Warning: 'muhurat' (system 'kp') will be overwritten if we don't handle uniqueness.
    // But since this API replaces the single chart, it's consistent with "Last Generated Horary".
    // Use 'muhurat' type
    const chart = await this.saveChart(
      tenantId,
      clientId,
      {
        chartType: "muhurat",
        chartName: `${client.fullName} - Horary #${horaryNumber}`,
        chartData: result,
        chartConfig: { system: "kp", horaryNumber, question },
        calculatedAt: new Date(),
        system: "kp",
      },
      metadata,
    );

    return {
      success: true,
      data: result,
      calculatedAt: chart.calculatedAt.toISOString(),
      system: "kp",
    };
  }
  /**
   * Get list of missing charts for a system by comparing capabilities against database
   */
  private async getMissingCharts(
    tenantId: string,
    clientId: string,
    system: AyanamsaSystem,
  ): Promise<string[]> {
    const capabilities = SYSTEM_CAPABILITIES[system];
    if (!capabilities) return [];

    const existing = await chartRepository.findMetadataByClientId(
      tenantId,
      clientId,
    );
    const existingTypes = new Set(
      existing
        .filter((c) => (c as any).system === system) // Strict system filtering
        .map((c) => c.chartType!.toString().toLowerCase()),
    );

    const expected: string[] = [
      ...capabilities.charts,
      ...capabilities.specialCharts,
    ];

    // 1. ASHTAKAVARGA
    if (capabilities.hasAshtakavarga) {
      expected.push(
        "ashtakavarga_sarva",
        "ashtakavarga_bhinna",
        "ashtakavarga_shodasha",
      );
    }

    // 2. DASHAS
    if (capabilities.dashas) {
      for (const d of capabilities.dashas) {
        if (d === "vimshottari") {
          expected.push("dasha_vimshottari"); // UI Tree
          // Also track Raw Prana for Lahiri/Raman
          if (system === "lahiri" || system === "raman") {
            expected.push("dasha");
          }
        } else {
          // FIX: Avoid double prefixing dasha_dasha_
          const type = d.toLowerCase().startsWith("dasha_") ? d : `dasha_${d}`;
          expected.push(type);
        }
      }
    }

    // 3. YOGAS
    if (capabilities.yogas) {
      for (const y of capabilities.yogas) {
        expected.push(`yoga_${y}`);
      }
    }

    // 4. DOSHAS
    if (capabilities.doshas) {
      for (const d of capabilities.doshas) {
        expected.push(`dosha_${d}`);
      }
    }

    // 5. REMEDIES
    if (capabilities.remedies) {
      for (const r of capabilities.remedies) {
        expected.push(`remedy_${r}`);
      }
    }

    // 6. UNIVERSAL CHARTS
    // These are handled by the 'universal' system entry in SYSTEM_CAPABILITIES
    // but we keep this block for backward compatibility/redundancy with Lahiri if needed
    if (system === "universal" || system === "lahiri") {
      const universalTypes = [
        "birth_panchanga",
        "choghadiya",
        "hora_times",
        "lagna_times",
        "muhurat",
      ];
      for (const type of universalTypes) {
        // Check if this universal chart already exists for the client
        const exists = existing.some(
          (c) =>
            c.chartType?.toString().toLowerCase() === type.toLowerCase() &&
            ((c as any).system === "universal" ||
              (c as any).chartConfig?.system === "universal"),
        );
        if (!exists) {
          expected.push(type);
        }
      }
    }

    // Filter out what we already have (redundancy check for system-specific)
    return expected.filter((type) => {
      const normalized = type.toLowerCase();
      // If it's a universal type we just added, it's already in the expected list only if missing
      return !existingTypes.has(normalized);
    });
  }

  // Helper to ensure Title Case for planet names (e.g. "sun" -> "Sun")
  private toTitleCase(str: string | undefined): string | undefined {
    if (!str) return undefined;
    if (str === "0") return "Sun"; // Map 0 to Sun if needed, but better to rely on string names
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

export const chartService = new ChartService();

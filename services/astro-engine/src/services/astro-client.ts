import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { config } from "../config";
import { logger } from "../config/logger";
import { cacheService } from "./cache.service";
import {
  LAHIRI_ENDPOINTS,
  KP_ENDPOINTS,
  RAMAN_ENDPOINTS,
  YUKTESWAR_ENDPOINTS,
} from "../constants/endpoints";
import { kpClient } from "../clients/kp.client";

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface BirthData {
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM:SS
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  userName?: string; // Optional user identifier
  ayanamsa?: "lahiri" | "kp" | "raman" | "yukteswar" | "western"; // Standardized field
}

export interface HoraryData extends BirthData {
  horaryNumber: number;
  question: string;
}

export interface ChartResponse {
  success: boolean;
  data: any;
  cached: boolean;
  calculatedAt: string;
  error?: string;
}

// =============================================================================
// Astro Engine Client - External API Communication
// =============================================================================

export class AstroEngineClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.astroEngineUrl,
      timeout: 60000, // 60 seconds for complex calculations
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (request: InternalAxiosRequestConfig) => {
        logger.info(
          { url: request.url, method: request.method },
          "Astro Engine API request",
        );
        return request;
      },
      (error: AxiosError) => {
        logger.error({ error: error.message }, "Request interceptor error");
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.info(
          { url: response.config.url, status: response.status },
          "Astro Engine API response",
        );
        return response;
      },
      (error: AxiosError) => {
        logger.error(
          {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
          },
          "Astro Engine API error",
        );
        throw error;
      },
    );
  }

  /**
   * Get the resolved ayanamsa system from birth data
   */
  private getAyanamsa(
    data: BirthData,
  ): "lahiri" | "kp" | "raman" | "yukteswar" | "western" {
    const ayanamsa = data.ayanamsa || "lahiri";
    return ayanamsa.toLowerCase() as
      | "lahiri"
      | "kp"
      | "raman"
      | "yukteswar"
      | "western";
  }

  /**
   * Build payload for external API (converts camelCase to snake_case)
   */
  private buildPayload(
    data: BirthData,
    extras: Record<string, any> = {},
  ): Record<string, any> {
    return {
      user_name: data.userName || "grahvani_client",
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: String(data.latitude),
      longitude: String(data.longitude),
      timezone_offset: data.timezoneOffset,
      system: this.getAyanamsa(data), // Explicitly pass resolved system to Python
      ayanamsa: this.getAyanamsa(data), // Added for redundancy
      ...extras,
    };
  }

  // =========================================================================
  // NATAL & TRANSIT CHARTS
  // =========================================================================

  /**
   * Generate Natal Chart (D1)
   */
  async getNatalChart(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    let endpoint: string = `/${system}/natal`;
    if (system === "kp") endpoint = KP_ENDPOINTS.PLANETS_CUSPS;
    if (system === "yukteswar") endpoint = YUKTESWAR_ENDPOINTS.NATAL;
    if (system === "raman") endpoint = RAMAN_ENDPOINTS.NATAL;
    if (system === "lahiri") endpoint = LAHIRI_ENDPOINTS.NATAL;

    // Cache for 24 hours (86400 seconds)
    const cached = await cacheService.get<any>(`natal:${system}`, data);
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(endpoint, this.buildPayload(data));
    await cacheService.set(`natal:${system}`, data, response.data, 86400);

    return { data: response.data, cached: false };
  }

  /**
   * Generate Transit Chart
   */
  async getTransitChart(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/transit`;

    // Cache for 1 hour (3600 seconds)
    const cached = await cacheService.get<any>(`transit:${system}`, data);
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(endpoint, this.buildPayload(data));
    await cacheService.set(`transit:${system}`, data, response.data, 3600);

    return { data: response.data, cached: false };
  }

  /**
   * Daily Transit — dynamic date-range transit (Lahiri-only, no cache)
   * Calls /lahiri/daily_transit with transit_start_date and transit_end_date
   */
  async getDailyTransit(
    data: BirthData & { transitStartDate: string; transitEndDate: string },
  ): Promise<any> {
    const endpoint = LAHIRI_ENDPOINTS.DAILY_TRANSIT;

    const response = await this.client.post(
      endpoint,
      this.buildPayload(data, {
        transit_start_date: data.transitStartDate,
        transit_end_date: data.transitEndDate,
      }),
    );

    return { data: response.data, cached: false };
  }

  /**
   * Get Moon Chart
   */
  async getMoonChart(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_moon_chart`;

    const cached = await cacheService.get<any>(`moon:${system}`, data);
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(endpoint, this.buildPayload(data));
    await cacheService.set(`moon:${system}`, data, response.data);

    return { data: response.data, cached: false };
  }

  /**
   * Get Sun Chart
   */
  async getSunChart(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_sun_chart`;

    const cached = await cacheService.get<any>(`sun:${system}`, data);
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(endpoint, this.buildPayload(data));
    await cacheService.set(`sun:${system}`, data, response.data);

    return { data: response.data, cached: false };
  }

  /**
   * Get Sudarshan Chakra
   */
  async getSudarshanChakra(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_sudarshan_chakra`;
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Yoga Analysis (Generic)
   */
  async getYoga(data: BirthData, yogaType: string): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri") {
      throw new Error(
        `Yoga analysis is only available for Lahiri system. Current system: ${system}`,
      );
    }

    // Map common names to specific Lahiri endpoints
    const endpointMap: Record<string, string> = {
      gaja_kesari: "comprehensive_gaja_kesari",
      guru_mangal: "comprehensive_guru_mangal",
      guru_mangal_only: "guru-mangal-only",
      budha_aditya: "budha-aditya-yoga",
      chandra_mangal: "chandra-mangal-yoga",
      raj_yoga: "raj-yoga",
      pancha_mahapurusha: "pancha-mahapurusha-yogas",
      daridra: "daridra-analysis",
      dhan: "dhan-yoga-analysis",
      malefic: "malefic_yogas",
      rare: "yoga-analysis",
      special: "special-yogas",
      spiritual: "spiritual_prosperity_yogas",
      shubh: "shubh-yogas",
      viparitha_raja: "viparitha-raja-yoga",
      kalpadruma: "kalpadruma-yoga",
      kala_sarpa: "kala-sarpa-fixed",
    };
    const endpoint = endpointMap[yogaType] || yogaType;

    const cached = await cacheService.get<any>(
      `yoga:${system}:${yogaType}`,
      data,
    );
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(
      `/${system}/${endpoint}`,
      this.buildPayload(data),
    );
    await cacheService.set(`yoga:${system}:${yogaType}`, data, response.data);

    return { data: response.data, cached: false };
  }

  /**
   * Get Dosha Analysis (Generic)
   */
  async getDosha(data: BirthData, doshaType: string): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri") {
      throw new Error(
        `Dosha analysis is only available for Lahiri system. Current system: ${system}`,
      );
    }

    const endpointMap: Record<string, string> = {
      kala_sarpa: "kala-sarpa-fixed",
      angarak: "calculate-angarak-dosha",
      guru_chandal: "guru-chandal-analysis",
      shrapit: "calculate-shrapit-dosha",
      sade_sati: "calculate-sade-sati",
      pitra: "pitra-dosha",
      dhaiya: "calculate_dhaiya",
    };
    const endpoint = endpointMap[doshaType] || doshaType;

    const cached = await cacheService.get<any>(
      `dosha:${system}:${doshaType}`,
      data,
    );
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(
      `/${system}/${endpoint}`,
      this.buildPayload(data),
    );
    await cacheService.set(`dosha:${system}:${doshaType}`, data, response.data);

    return { data: response.data, cached: false };
  }

  /**
   * Get Remedial Recommendations (Generic)
   */
  async getRemedy(data: BirthData, type: string): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri") {
      throw new Error(
        `Remedies are only available for Lahiri system. Current system: ${system}`,
      );
    }

    const endpointMap: Record<string, string> = {
      yantra: "yantra-recommendations",
      mantra: "mantra-analysis",
      general: "vedic_remedies",
      vedic: "vedic_remedies",
      vedic_remedies: "vedic_remedies",
      gemstone: "calculate-gemstone",
      lal_kitab: "lal-kitab-remedies",
      chart_remedies: "chart-with-remedies",
    };
    const endpoint = endpointMap[type] || type;
    // Some remedies match /lahiri/ endpoint directly, others need specific paths
    const response = await this.client.post(
      `/${system}/${endpoint}`,
      this.buildPayload(data),
    );
    return response.data;
  }

  /**
   * Get Panchanga & Muhurat Elements (Generic)
   */
  async getPanchanga(
    data: BirthData,
    type: string = "panchanga",
  ): Promise<any> {
    // Panchanga is an independent module in python, but usually proxied.
    // Based on ApiEndPoints.txt, it lives at root /panchanga or /choghadiya_times etc.
    // It does NOT seem to be prefixed by /{system}/ unless it's /lahiri/guna-milan

    const endpointMap: Record<string, string> = {
      panchanga: "/panchanga",
      choghadiya: "/choghadiya_times",
      hora: "/hora_times",
      lagna_times: "/lagna_times",
      muhurat: "/muhurat",
      panchanga_month: "/panchanga/month",
      avakhada_chakra: "/lahiri/avakhada_chakra",
    };

    const absoluteEndpoint = endpointMap[type];
    if (absoluteEndpoint) {
      const response = await this.client.post(
        absoluteEndpoint,
        this.buildPayload(data),
      );
      return response.data;
    }

    // If it falls through, it might be something else, but strictly sticking to known list
    throw new Error(`Unknown Panchanga type: ${type}`);
  }

  /**
   * Get Shadbala (Planetary Strength)
   */
  async getShadbala(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error(
        "Shadbala is currently only available for Lahiri system.",
      );

    const cached = await cacheService.get<any>(`shadbala:${system}`, data);
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(
      `/${system}/calculate_shadbala`,
      this.buildPayload(data),
    );
    await cacheService.set(`shadbala:${system}`, data, response.data);

    return { data: response.data, cached: false };
  }

  /**
   * Get Specialized Charts (Generic)
   */
  async getSpecialChart(data: BirthData, type: string): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpointMap: Record<string, string> = {
      arudha_lagna: "calculate_arudha_lagna",
      bhava_lagna: "calculate_bhava_lagna",
      hora_lagna: "calculate_hora_lagna",
      sripathi_bhava: "calculate_sripathi_bhava",
      kp_bhava: "calculate_kp_bhava",
      equal_bhava: "calculate_equal_bhava",
      karkamsha: "calculate_karkamsha",
      shadbala: "calculate_shadbala",
    };
    const endpoint = endpointMap[type] || type;
    const response = await this.client.post(
      `/${system}/${endpoint}`,
      this.buildPayload(data),
    );
    return response.data;
  }

  // =========================================================================
  // DIVISIONAL CHARTS (D2-D60)
  // =========================================================================

  /**
   * Generate Divisional Chart
   */
  async getDivisionalChart(data: BirthData, chartType: string): Promise<any> {
    const system = this.getAyanamsa(data);
    const type = chartType.toLowerCase();

    // KP divisional routing (not supported, fallback or error)
    if (system === "kp") {
      throw new Error(
        "Divisional charts (D2-D60) are not supported in the KP system. Please use Lahiri or Raman.",
      );
    }

    const cached = await cacheService.get<any>(
      `divisional:${system}:${type}`,
      data,
    );
    if (cached) return { data: cached, cached: true };

    // System-aware endpoint mappings
    const systemMappings: Record<string, Record<string, string>> = {
      raman: {
        d2: "calculate_d2_hora",
        d3: "calculate_d3_chart",
        d4: "calculate_d4",
        d7: "calculate_d7_chart",
        d9: "navamsha_d9",
        d10: "calculate_d10",
        d12: "calculate_d12",
        d16: "calculate_d16",
        d20: "calculate_d20",
        d24: "calculate_d24",
        d27: "calculate_d27_chart",
        d30: "calculate_d30_chart",
        d40: "calculate_d40",
        d45: "calculate_d45",
        d60: "calculate_d60",
      },
      lahiri: {
        d2: "calculate_d2_hora",
        d3: "calculate_d3",
        d4: "calculate_d4",
        d7: "calculate_d7_chart",
        d9: "navamsa",
        d10: "calculate_d10",
        d12: "calculate_d12",
        d16: "calculate_d16",
        d20: "calculate_d20",
        d24: "calculate_d24",
        d27: "calculate_d27",
        d30: "calculate_d30",
        d40: "calculate_d40",
        d45: "calculate_d45",
        d60: "calculate_d60",
      },
      yukteswar: {
        d2: "calculate_d2",
        d3: "calculate_d3",
        d4: "calculate_d4",
        d7: "calculate_d7",
        d9: "calculate_d9",
        d10: "calculate_d10",
        d12: "calculate_d12",
        d16: "calculate_d16",
        d20: "calculate_d20",
        d24: "calculate_d24",
        d27: "calculate_d27",
        d30: "calculate_d30",
        d40: "calculate_d40",
        d45: "calculate_d45",
        d60: "calculate_d60",
      },
    };

    const endpointPath = systemMappings[system]?.[type] || type;
    const endpoint = `/${system}/${endpointPath}`;

    const response = await this.client.post(endpoint, this.buildPayload(data));
    await cacheService.set(`divisional:${system}:${type}`, data, response.data);

    return { data: response.data, cached: false };
  }

  // =========================================================================
  // KP SYSTEM
  // =========================================================================

  /**
   * Get KP Planets and Cusps with sub-lords
   */
  async getKpPlanetsCusps(data: BirthData): Promise<any> {
    const endpoint = "/kp/cusps_chart";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Ruling Planets
   */
  async getRulingPlanets(data: BirthData): Promise<any> {
    const endpoint = "/kp/calculate_ruling_planets";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Bhava Details
   */
  async getBhavaDetails(data: BirthData): Promise<any> {
    const endpoint = "/kp/calculate_bhava_details";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get House Significations
   */
  async getSignifications(data: BirthData): Promise<any> {
    const endpoint = "/kp/calculate_significations";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Planet Significators (Planet View - Second Table)
   */
  async getPlanetSignificators(data: BirthData): Promise<any> {
    return kpClient.getPlanetSignificators(data);
  }

  /**
   * KP Horary Analysis
   */
  async getKpHorary(data: HoraryData): Promise<any> {
    const endpoint = "/kp/kp_horary";

    const payload = {
      horary_number: data.horaryNumber,
      date: data.birthDate,
      time: data.birthTime,
      latitude: String(data.latitude),
      longitude: String(data.longitude),
      timezone_offset: data.timezoneOffset,
      ayanamsa: data.ayanamsa || "lahiri",
      system: data.ayanamsa || "lahiri", // Added for backward/forward compatibility
      question: data.question,
    };

    const response = await this.client.post(endpoint, payload);
    return response.data;
  }

  // =========================================================================
  // DASHA SYSTEM (Vimshottari)
  // =========================================================================

  /**
   * Get Vimshottari Dasha at specified level
   */
  async getVimshottariDasha(
    data: BirthData,
    level: string = "mahadasha",
    context: Record<string, string> = {},
  ): Promise<any> {
    const system = this.getAyanamsa(data);
    let endpoint = "";

    if (system === "raman") {
      const ramanEndpoints: Record<string, string> = {
        mahadasha: "/raman/calculate_maha_antar_dashas",
        antardasha: "/raman/calculate_maha_antar_dashas",
        pratyantardasha: "/raman/calculate_maha_antar_pratyantar_dasha",
        sookshma: "/raman/calculate_sookshma_dasha_raman",
        prana: "/raman/calculate_raman_prana_dasha",
      };
      endpoint =
        ramanEndpoints[level.toLowerCase()] || ramanEndpoints["mahadasha"];
    } else if (system === "kp") {
      const kpEndpoints: Record<string, string> = {
        mahadasha: "/kp/calculate_maha_antar_dasha",
        antardasha: "/kp/calculate_maha_antar_dasha",
        pratyantardasha: "/kp/calculate_maha_antar_pratyantar_dasha",
        sookshma: "/kp/calculate_maha_antar_pratyantar_sooksha_dasha",
        prana: "/kp/calculate_maha_antar_pratyantar_pran_dasha",
      };
      endpoint = kpEndpoints[level.toLowerCase()] || kpEndpoints["mahadasha"];
    } else if (system === "yukteswar") {
      const yukteswarEndpoints: Record<string, string> = {
        mahadasha: "/yukteswar/calculate_mahaantar_dasha",
        antardasha: "/yukteswar/calculate_mahaantar_dasha",
        pratyantardasha: "/yukteswar/calculate_pratyantar_dasha",
        sookshma: "/yukteswar/calculate_sookshma_dasha",
        prana: "/yukteswar/calculate_prana_dasha",
      };
      endpoint =
        yukteswarEndpoints[level.toLowerCase()] ||
        yukteswarEndpoints["mahadasha"];
    } else {
      // Lahiri/Default
      const lahiriEndpoints: Record<string, string> = {
        mahadasha: "/lahiri/calculate_antar_dasha",
        antardasha: "/lahiri/calculate_antar_dasha",
        pratyantardasha: "/lahiri/prathythar_dasha_lahiri",
        sookshma: "/lahiri/calculate_antar_pratyantar_sookshma_dasha",
        prana: "/lahiri/calculate_sookshma_prana_dashas",
      };
      endpoint =
        lahiriEndpoints[level.toLowerCase()] || lahiriEndpoints["mahadasha"];
    }

    // Map frontend camelCase context to backend snake_case if they exist
    const extras: Record<string, any> = {};
    if (context.mahaLord) extras.maha_lord = context.mahaLord;
    if (context.antarLord) extras.antar_lord = context.antarLord;
    if (context.pratyantarLord) extras.pratyantar_lord = context.pratyantarLord;

    const response = await this.client.post(
      endpoint,
      this.buildPayload(data, extras),
    );
    return response.data;
  }

  /**
   * Get Lahiri Dasha (Antar level)
   */
  async getLahiriAntarDasha(data: BirthData): Promise<any> {
    const endpoint = "/lahiri/calculate_antar_dasha";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Other Dasha Systems (Tribhagi, Shodashottari, Dwadashottari, etc.)
   */
  async getOtherDasha(
    data: BirthData,
    dashaType: string,
    context: Record<string, any> = {},
  ): Promise<any> {
    const system = this.getAyanamsa(data);
    const lowerType = dashaType.toLowerCase();
    let endpoint = "";

    if (system === "yukteswar") {
      const yukteswarMap: Record<string, string> = {
        mahaantar: YUKTESWAR_ENDPOINTS.MAHA_ANTAR_DASHA,
        pratyantar: YUKTESWAR_ENDPOINTS.PRATYANTAR_DASHA,
        sookshma: YUKTESWAR_ENDPOINTS.SOOKSHMA_DASHA,
        prana: YUKTESWAR_ENDPOINTS.PRANA_DASHA,
        ashtottari: YUKTESWAR_ENDPOINTS.ASHTOTTARI_ANTAR,
        ashtottari_antar: YUKTESWAR_ENDPOINTS.ASHTOTTARI_ANTAR,
        ashtottari_pratyantardasha: YUKTESWAR_ENDPOINTS.ASHTOTTARI_PRATYANTAR,
        tribhagi: YUKTESWAR_ENDPOINTS.TRIBHAGI,
        tribhagi_40: YUKTESWAR_ENDPOINTS.TRIBHAGI_40, // Handle underscore alias
        shodashottari: YUKTESWAR_ENDPOINTS.SHODASHOTTARI,
        dwadashottari: YUKTESWAR_ENDPOINTS.DWADASHOTTARI,
        dwisaptati: YUKTESWAR_ENDPOINTS.DWISAPTATISAMA,
        dwisaptatisama: YUKTESWAR_ENDPOINTS.DWISAPTATISAMA,
        shastihayani: YUKTESWAR_ENDPOINTS.SHASTIHAYANI,
        shattrimshatsama: YUKTESWAR_ENDPOINTS.SHATTRIMSHATSAMA,
        panchottari: YUKTESWAR_ENDPOINTS.PANCHOTTARI,
        satabdika: YUKTESWAR_ENDPOINTS.SATABDIKA,
        chaturshitisama: YUKTESWAR_ENDPOINTS.CHATURSHITISAMA,
      };
      endpoint = yukteswarMap[lowerType];
    } else {
      // Default to Lahiri map (existing logic)
      const endpointMap: Record<string, string> = {
        tribhagi: "/lahiri/calculate_tribhagi_dasha",
        "tribhagi-40": "/lahiri/tribhagi-dasha-40",
        tribhagi_40: "/lahiri/tribhagi-dasha-40", // Handle underscore alias from client-service
        shodashottari: "/lahiri/shodashottari-dasha",
        dwadashottari: "/lahiri/dwadashottari-dasha",
        panchottari: "/lahiri/calculate-panchottari-dasha",
        chaturshitisama: "/lahiri/calculate_Chaturshitisama_dasha",
        satabdika: "/lahiri/calculate_satabdika",
        dwisaptati: "/lahiri/calculate_dwisaptati",
        shastihayani: "/lahiri/calculate_shastihayani",
        shattrimshatsama: "/lahiri/calculate_Shattrimshatsama_dasha",
        chara: "/kp/chara-dasha",
        ashtottari: "/lahiri/calculate_ashtottari_antar",
        ashtottari_antar: "/lahiri/calculate_ashtottari_antar",
        ashtottari_pratyantardasha: "/lahiri/calculate_ashtottari_prathyantar",
        dasha_3months: "/lahiri/calculate_vimshottari_dasha_3months",
        dasha_6months: "/lahiri/calculate_vimshottari_dasha_6months",
        dasha_report_1year: "/lahiri/dasha_report_1year",
        dasha_report_2years: "/lahiri/dasha_report_2years",
        dasha_report_3years: "/lahiri/dasha_report_3years",
      };
      endpoint = endpointMap[lowerType];
    }
    if (!endpoint) {
      throw new Error(`Unknown dasha type: ${dashaType} for system ${system}`);
    }

    // Map frontend camelCase context to backend snake_case if they exist
    const extras: Record<string, any> = {};
    if (context.mahaLord) extras.maha_lord = context.mahaLord;
    if (context.antarLord) extras.antar_lord = context.antarLord;
    if (context.pratyantarLord) extras.pratyantar_lord = context.pratyantarLord;

    const cached = await cacheService.get<any>(
      `dasha_other:${system}:${dashaType}:${JSON.stringify(extras)}`,
      data,
    );
    if (cached) return { data: cached, cached: true };

    const response = await this.client.post(
      endpoint,
      this.buildPayload(data, extras),
    );
    await cacheService.set(
      `dasha_other:${system}:${dashaType}:${JSON.stringify(extras)}`,
      data,
      response.data,
    );

    return { data: response.data, cached: false };
  }

  /**
   * Get Mandi (Lahiri only)
   */
  async getMandi(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error("Mandi calculation is only available for Lahiri system.");
    const response = await this.client.post(
      LAHIRI_ENDPOINTS.MANDI,
      this.buildPayload(data),
    );
    return response.data;
  }

  /**
   * Get Gulika (Lahiri only)
   */
  async getGulika(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error(
        "Gulika calculation is only available for Lahiri system.",
      );
    const response = await this.client.post(
      LAHIRI_ENDPOINTS.GULIKA,
      this.buildPayload(data),
    );
    return response.data;
  }

  /**
   * Get D40 (Khavedamsa) - Now explicitly supported
   */
  async getD40(data: BirthData): Promise<any> {
    return this.getDivisionalChart(data, "d40");
  }

  /**
   * Get D150 (Nadiamsha) - Lahiri only
   */
  async getD150(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error("D150 Nadiamsha is only available for Lahiri system.");
    const response = await this.client.post(
      LAHIRI_ENDPOINTS.D150_NADIAMSHA,
      this.buildPayload(data),
    );
    return response.data;
  }

  // =========================================================================
  // ASHTAKAVARGA
  // =========================================================================

  /**
   * Get Bhinna Ashtakavarga (individual planets)
   */
  async getBhinnaAshtakavarga(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    let endpoint: string = LAHIRI_ENDPOINTS.BHINNA_ASHTAKAVARGA;

    if (system === "raman") endpoint = RAMAN_ENDPOINTS.BHINNA_ASHTAKAVARGA;
    if (system === "yukteswar")
      endpoint = YUKTESWAR_ENDPOINTS.BHINNA_ASHTAKAVARGA;
    if (system === "kp") endpoint = "/lahiri/calculate_binnatakvarga"; // Fallback for KP

    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Sarva Ashtakavarga (combined)
   */
  async getSarvaAshtakavarga(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    let endpoint: string = LAHIRI_ENDPOINTS.SARVA_ASHTAKAVARGA;

    if (system === "raman") endpoint = RAMAN_ENDPOINTS.SARVA_ASHTAKAVARGA;
    if (system === "yukteswar")
      endpoint = YUKTESWAR_ENDPOINTS.SARVA_ASHTAKAVARGA;
    if (system === "kp") endpoint = "/lahiri/calculate_sarvashtakavarga"; // Fallback for KP

    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Shodasha Varga Summary (16 divisional chart signs)
   */
  async getShodashaVargaSummary(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    let endpoint: string = LAHIRI_ENDPOINTS.SHODASHA_VARGA_SUMMARY;

    if (system === "raman") endpoint = RAMAN_ENDPOINTS.SHODASHA_VARGA;
    if (system === "kp") endpoint = KP_ENDPOINTS.SHODASHA_VARGA;
    if (system === "yukteswar")
      endpoint = YUKTESWAR_ENDPOINTS.SHODASHA_VARGA_SUMMARY;

    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  // Legacy method - maps to Bhinna for backward compatibility
  async getAshtakavarga(data: BirthData): Promise<any> {
    return this.getBhinnaAshtakavarga(data);
  }

  // =========================================================================
  // LAGNA CHARTS (Special Ascendants)
  // =========================================================================

  /**
   * Get Arudha Lagna
   */
  async getArudhaLagna(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_arudha_lagna`;
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Bhava Lagna
   */
  async getBhavaLagna(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_bhava_lagna`;
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Hora Lagna
   */
  async getHoraLagna(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_hora_lagna`;
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  /**
   * Get Sripathi Bhava
   */
  async getSripathiBhava(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/calculate_sripathi_bhava`;
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  // =========================================================================
  // COMPATIBILITY & NUMEROLOGY
  // =========================================================================

  /**
   * Get Synastry (chart comparison)
   */
  async getSynastry(person1: BirthData, person2: BirthData): Promise<any> {
    const endpoint = "/lahiri/synastry";
    // Synastry requires two sets of birth data
    const payload = {
      person1: this.buildPayload(person1),
      person2: this.buildPayload(person2),
    };
    const response = await this.client.post(endpoint, payload);
    return response.data;
  }

  /**
   * Get Chaldean Numerology
   */
  async getChaldeanNumerology(
    data: BirthData & { name: string },
  ): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error("Numerology is only available for Lahiri system.");

    const endpoint = "/lahiri/chaldean_numerology";
    const response = await this.client.post(endpoint, {
      ...this.buildPayload(data),
      name: data.name,
    });
    return response.data;
  }

  /**
   * Get Progressed Chart
   * Secondary progressions for predictive analysis
   */
  async getProgressedChart(
    data: BirthData,
    progressedDate: string,
  ): Promise<any> {
    const system = this.getAyanamsa(data);
    const endpoint = `/${system}/progressed`;
    const response = await this.client.post(endpoint, {
      ...this.buildPayload(data),
      progressed_date: progressedDate,
    });
    return response.data;
  }

  /**
   * Get Composite Chart (midpoint chart for two people)
   */
  async getCompositeChart(
    person1: BirthData,
    person2: BirthData,
  ): Promise<any> {
    const endpoint = "/lahiri/composite";
    const payload = {
      person1: this.buildPayload(person1),
      person2: this.buildPayload(person2),
    };
    const response = await this.client.post(endpoint, payload);
    return response.data;
  }

  /**
   * Get Lo Shu Grid Numerology
   */
  async getLoShuGrid(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error("Numerology is only available for Lahiri system.");

    const endpoint = "/lahiri/lo_shu_grid_numerology";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  async getKpSignificators(data: BirthData): Promise<any> {
    return this.client
      .post(KP_ENDPOINTS.PLANET_SIGNIFICATORS, this.buildPayload(data))
      .then((r) => r.data);
  }

  async getKpInterlinks(data: BirthData): Promise<any> {
    return this.client
      .post(KP_ENDPOINTS.CUSPAL_INTERLINK, this.buildPayload(data))
      .then((r) => r.data);
  }

  async getKpAdvancedInterlinks(data: BirthData): Promise<any> {
    return this.client
      .post(KP_ENDPOINTS.CUSPAL_INTERLINK_ADV, this.buildPayload(data))
      .then((r) => r.data);
  }

  async getKpInterlinksSL(data: BirthData): Promise<any> {
    return this.client
      .post(KP_ENDPOINTS.CUSPAL_INTERLINK_SL, this.buildPayload(data))
      .then((r) => r.data);
  }

  async getKpNakshatraNadi(data: BirthData): Promise<any> {
    return this.client
      .post(KP_ENDPOINTS.NAKSHATRA_NADI, this.buildPayload(data))
      .then((r) => r.data);
  }

  async getKpFortuna(data: BirthData): Promise<any> {
    return this.client
      .post(KP_ENDPOINTS.FORTUNA, this.buildPayload(data))
      .then((r) => r.data);
  }

  async getPersonNumerology(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error("Numerology is only available for Lahiri system.");

    const endpoint = "/lahiri/person_numerology";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  async getGunaMilan(data: BirthData): Promise<any> {
    const system = this.getAyanamsa(data);
    if (system !== "lahiri")
      throw new Error("Guna Milan is only available for Lahiri system.");

    const endpoint = "/lahiri/guna-milan";
    const response = await this.client.post(endpoint, this.buildPayload(data));
    return response.data;
  }

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  /**
   * Health check for external Astro Engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health", { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const astroEngineClient = new AstroEngineClient();

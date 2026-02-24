import { BaseAstroClient } from "./base.client";
import { BirthData } from "../types";
import { YUKTESWAR_ENDPOINTS } from "../constants";

// =============================================================================
// SRI YUKTESWAR AYANAMSA CLIENT
// Handles all Yukteswar system calculations
// =============================================================================

export class YukteswarClient extends BaseAstroClient {
  constructor() {
    super("yukteswar-client");
  }

  // =========================================================================
  // NATAL & TRANSIT CHARTS
  // =========================================================================

  async getNatalChart(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.NATAL, data);
  }

  async getTransitChart(data: BirthData) {
    // Fallback to natal formulation or if transit endpoint added
    return this.post(YUKTESWAR_ENDPOINTS.TRANSIT, data);
  }

  async getMoonChart(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.MOON_CHART, data);
  }

  async getSunChart(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SUN_CHART, data);
  }

  async getSudarshanChakra(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SUDARSHAN_CHAKRA, data);
  }

  async getEqualBhava(data: BirthData) {
    // Map equal bhava to equal chart for Yukteswar
    return this.post(YUKTESWAR_ENDPOINTS.EQUAL_CHART, data);
  }

  async getEqualChart(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.EQUAL_CHART, data);
  }

  // =========================================================================
  // DIVISIONAL CHARTS (D2-D60)
  // =========================================================================

  async getDivisionalChart(data: BirthData, chartType: string) {
    const type = chartType.toLowerCase();
    // Map D-charts to endpoints
    const map: Record<string, string> = {
      d1: YUKTESWAR_ENDPOINTS.NATAL,
      d2: YUKTESWAR_ENDPOINTS.D2_HORA,
      d3: YUKTESWAR_ENDPOINTS.D3_DREKKANA,
      d4: YUKTESWAR_ENDPOINTS.D4_CHATURTHAMSHA,
      d7: YUKTESWAR_ENDPOINTS.D7_SAPTAMSHA,
      d9: YUKTESWAR_ENDPOINTS.D9_NAVAMSA,
      d10: YUKTESWAR_ENDPOINTS.D10_DASAMSA,
      d12: YUKTESWAR_ENDPOINTS.D12_DWADASAMSA,
      d16: YUKTESWAR_ENDPOINTS.D16_SHODASAMSA,
      d20: YUKTESWAR_ENDPOINTS.D20_VIMSHAMSA,
      d24: YUKTESWAR_ENDPOINTS.D24_CHATURVIMSHAMSA,
      d27: YUKTESWAR_ENDPOINTS.D27_SAPTAVIMSHAMSA,
      d30: YUKTESWAR_ENDPOINTS.D30_TRIMSHAMSA,
      d40: YUKTESWAR_ENDPOINTS.D40_KHAVEDAMSA,
      d45: YUKTESWAR_ENDPOINTS.D45_AKSHAVEDAMSA,
      d60: YUKTESWAR_ENDPOINTS.D60_SHASHTIAMSA,
    };
    const endpoint = map[type];
    if (!endpoint) throw new Error(`Unknown divisional chart type for Yukteswar: ${type}`);
    return this.post(endpoint, data);
  }

  // Specific methods
  async getD2Hora(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.D2_HORA, data);
  }
  async getD3Drekkana(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.D3_DREKKANA, data);
  }
  // ... others mapped via getDivisionalChart mainly, but exposing if needed by controller

  // =========================================================================
  // LAGNA CHARTS (Special Ascendants)
  // =========================================================================

  async getArudhaLagna(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.ARUDHA_LAGNA, data);
  }
  async getBhavaLagna(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.BHAVA_LAGNA, data);
  }
  async getHoraLagna(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.HORA_LAGNA, data);
  }
  async getSripathiBhava(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SRIPATHI_BHAVA, data);
  }
  async getKpBhava(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.KP_BHAVA, data);
  }
  async getGlChart(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.GL_CHART, data);
  }
  async getKarkamshaD1(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.KARKAMSHA_D1, data);
  }
  async getKarkamshaD9(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.KARKAMSHA_D9, data);
  }

  // =========================================================================
  // ASHTAKAVARGA
  // =========================================================================

  async getBhinnaAshtakavarga(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.BHINNA_ASHTAKAVARGA, data);
  }

  async getSarvaAshtakavarga(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SARVA_ASHTAKAVARGA, data);
  }

  async getShodashaVarga(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SHODASHA_VARGA_SUMMARY, data);
  }

  // =========================================================================
  // DASHA
  // =========================================================================

  async getMahaAntarDasha(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.MAHA_ANTAR_DASHA, data);
  }
  async getPratyantarDasha(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.PRATYANTAR_DASHA, data);
  }
  async getSookshmaDasha(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SOOKSHMA_DASHA, data);
  }
  async getPranaDasha(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.PRANA_DASHA, data);
  }

  // Other Dasha systems
  // Other Dasha systems
  async getAshtottariAntar(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.ASHTOTTARI_ANTAR, data);
  }
  async getAshtottariPratyantar(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.ASHTOTTARI_PRATYANTAR, data);
  }
  async getTribhagi(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.TRIBHAGI, data);
  }
  async getTribhagi40(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.TRIBHAGI_40, data);
  }
  async getShodashottari(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SHODASHOTTARI, data);
  }
  async getDwadashottari(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.DWISAPTATISAMA, data);
  } // Note: Check if Dwadashottari exists for Yukteswar. ApiEndPoints lists Dwisaptati.
  // ApiEndPoints.txt lines 257-263:
  // 257: calculate_shodashottari_dasha
  // 258: calculate_dwisaptatisama
  // 259: calculate_shastihayani
  // 260: calculate_shattrimshatsama
  // 261: calculate_panchottari
  // 262: calculate_satabdika
  // 263: calculate_chaturshitisama_dasha

  async getDwisaptati(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.DWISAPTATISAMA, data);
  }
  async getShastihayani(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SHASTIHAYANI, data);
  }
  async getShattrimshatsama(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SHATTRIMSHATSAMA, data);
  }
  async getPanchottari(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.PANCHOTTARI, data);
  }
  async getSatabdika(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.SATABDIKA, data);
  }
  async getChaturshitisama(data: BirthData) {
    return this.post(YUKTESWAR_ENDPOINTS.CHATURSHITISAMA, data);
  }
}

export const yukteswarClient = new YukteswarClient();

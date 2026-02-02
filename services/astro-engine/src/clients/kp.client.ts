import { BaseAstroClient } from './base.client';
import { BirthData, HoraryData } from '../types';
import { KP_ENDPOINTS, DASHA_LEVEL_MAP } from '../constants';

// =============================================================================
// KP (KRISHNAMURTI PADDHATI) SYSTEM CLIENT
// Handles all KP system calculations (12 endpoints)
// =============================================================================

export class KpClient extends BaseAstroClient {
    constructor() {
        super('kp-client');
    }

    // =========================================================================
    // PLANETS & CUSPS
    // =========================================================================

    /**
     * Get planets and cusps with sub-lords
     * Returns: ascendant, house_cusps, planets, significators
     */
    async getPlanetsCusps(data: BirthData) {
        return this.post(KP_ENDPOINTS.PLANETS_CUSPS, data);
    }

    /**
     * Get current ruling planets
     * For timing analysis
     */
    async getRulingPlanets(data: BirthData) {
        return this.post(KP_ENDPOINTS.RULING_PLANETS, data);
    }

    /**
     * Get bhava (house) details
     */
    async getBhavaDetails(data: BirthData) {
        return this.post(KP_ENDPOINTS.BHAVA_DETAILS, data);
    }

    /**
     * Get house significations (House View - First Table)
     * Which planets signify which houses
     */
    async getSignifications(data: BirthData) {
        return this.post(KP_ENDPOINTS.SIGNIFICATIONS, data);
    }

    /**
     * Get planet significators (Planet View - Second Table)
     * Which houses are signified by each planet
     */
    async getPlanetSignificators(data: BirthData) {
        return this.post(KP_ENDPOINTS.PLANET_SIGNIFICATORS, data);
    }

    // =========================================================================
    // VIMSHOTTARI DASHA (5 Levels)
    // =========================================================================

    /**
     * Get Vimshottari Dasha at specified level
     * @param level - mahadasha | antardasha | pratyantardasha | sookshma | prana
     */
    async getVimshottariDasha(data: BirthData, level: string = 'mahadasha', context: Record<string, string> = {}) {
        const endpoint = DASHA_LEVEL_MAP[level.toLowerCase()] || DASHA_LEVEL_MAP['mahadasha'];
        return this.post(endpoint, data, context);
    }

    async getMahaAntarDasha(data: BirthData) {
        return this.post(KP_ENDPOINTS.MAHA_ANTAR_DASHA, data);
    }

    async getPratyantarDasha(data: BirthData) {
        return this.post(KP_ENDPOINTS.PRATYANTAR_DASHA, data);
    }

    async getSookshmaDasha(data: BirthData) {
        return this.post(KP_ENDPOINTS.SOOKSHMA_DASHA, data);
    }

    async getPranaDasha(data: BirthData) {
        return this.post(KP_ENDPOINTS.PRANA_DASHA, data);
    }

    async getCharaDasha(data: BirthData) {
        return this.post(KP_ENDPOINTS.CHARA_DASHA, data);
    }

    // =========================================================================
    // HORARY (Prashna)
    // =========================================================================

    /**
     * KP Horary analysis
     * @param data - Includes horaryNumber (1-249) and question
     */
    async getHorary(data: HoraryData) {
        const payload = {
            horary_number: data.horaryNumber,
            date: data.birthDate,
            time: data.birthTime,
            latitude: String(data.latitude),
            longitude: String(data.longitude),
            tz_offset: data.timezoneOffset,
            question: data.question,
        };
        const response = await this.client.post(KP_ENDPOINTS.HORARY, payload);
        return response.data;
    }

    // =========================================================================
    // VARGA SUMMARY
    // =========================================================================

    /**
     * Get Shodasha Varga (16 divisional chart signs summary)
     */
    async getShodashaVarga(data: BirthData) {
        return this.post(KP_ENDPOINTS.SHODASHA_VARGA, data);
    }

    // Ashtakavarga (Fallback to Lahiri if KP-specific not available)
    async getBhinnaAshtakavarga(data: BirthData) {
        return this.post('/lahiri/calculate_binnatakvarga', data);
    }

    async getSarvaAshtakavarga(data: BirthData) {
        return this.post('/lahiri/calculate_sarvashtakavarga', data);
    }
}

export const kpClient = new KpClient();

import { BaseAstroClient } from './base.client';
import { BirthData } from '../types';
import { RAMAN_ENDPOINTS } from '../constants';

// =============================================================================
// RAMAN AYANAMSA CLIENT
// Handles all Raman system calculations (35+ endpoints)
// =============================================================================

export class RamanClient extends BaseAstroClient {
    constructor() {
        super('raman-client');
    }

    // =========================================================================
    // NATAL & TRANSIT CHARTS
    // =========================================================================

    async getNatalChart(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.NATAL, data);
    }

    async getTransitChart(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.TRANSIT, data);
    }

    async getMoonChart(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.MOON_CHART, data);
    }

    async getSunChart(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.SUN_CHART, data);
    }

    async getSudarshanChakra(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.SUDARSHAN_CHAKRA, data);
    }

    // =========================================================================
    // DIVISIONAL CHARTS (D2-D60)
    // =========================================================================

    async getDivisionalChart(data: BirthData, chartType: string) {
        const chartEndpoints: Record<string, string> = {
            'd2': 'calculate_d2_hora',
            'd3': 'calculate_d3_chart',
            'd4': 'calculate_d4',
            'd7': 'calculate_d7_chart',
            'd9': 'navamsha_d9',
            'd10': 'calculate_d10',
            'd12': 'calculate_d12',
            'd16': 'calculate_d16',
            'd20': 'calculate_d20',
            'd24': 'calculate_d24',
            'd27': 'calculate_d27_chart',
            'd30': 'calculate_d30_chart',
            'd40': 'calculate_d40',
            'd45': 'calculate_d45',
            'd60': 'calculate_d60',
        };
        const endpoint = chartEndpoints[chartType.toLowerCase()] || chartType.toLowerCase();
        return this.post(`/raman/${endpoint}`, data);
    }
    async getD2Hora(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D2_HORA, data); }
    async getD3Drekkana(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D3_DREKKANA, data); }
    async getD4Chaturthamsha(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D4_CHATURTHAMSHA, data); }
    async getD7Saptamsha(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D7_SAPTAMSHA, data); }
    async getD9Navamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D9_NAVAMSA, data); }
    async getD10Dasamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D10_DASAMSA, data); }
    async getD12Dwadasamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D12_DWADASAMSA, data); }
    async getD16Shodasamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D16_SHODASAMSA, data); }
    async getD20Vimshamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D20_VIMSHAMSA, data); }
    async getD24Chaturvimshamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D24_CHATURVIMSHAMSA, data); }
    async getD27Saptavimshamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D27_SAPTAVIMSHAMSA, data); }
    async getD30Trimshamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D30_TRIMSHAMSA, data); }
    async getD40Khavedamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D40_KHAVEDAMSA, data); }
    async getD45Akshavedamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D45_AKSHAVEDAMSA, data); }
    async getD60Shashtiamsa(data: BirthData) { return this.post(RAMAN_ENDPOINTS.D60_SHASHTIAMSA, data); }

    // =========================================================================
    // LAGNA CHARTS
    // =========================================================================

    async getArudhaLagna(data: BirthData) { return this.post(RAMAN_ENDPOINTS.ARUDHA_LAGNA, data); }
    async getBhavaLagna(data: BirthData) { return this.post(RAMAN_ENDPOINTS.BHAVA_LAGNA, data); }
    async getHoraLagna(data: BirthData) { return this.post(RAMAN_ENDPOINTS.HORA_LAGNA, data); }
    async getSripathiBhava(data: BirthData) { return this.post(RAMAN_ENDPOINTS.SRIPATHI_BHAVA, data); }
    async getKpBhava(data: BirthData) { return this.post(RAMAN_ENDPOINTS.KP_BHAVA, data); }
    async getEqualBhava(data: BirthData) { return this.post(RAMAN_ENDPOINTS.EQUAL_BHAVA, data); }
    async getKarkamshaD1(data: BirthData) { return this.post(RAMAN_ENDPOINTS.KARKAMSHA_D1, data); }
    async getKarkamshaD9(data: BirthData) { return this.post(RAMAN_ENDPOINTS.KARKAMSHA_D9, data); }

    // =========================================================================
    // ASHTAKAVARGA
    // =========================================================================

    async getBhinnaAshtakavarga(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.BHINNA_ASHTAKAVARGA, data);
    }

    async getSarvaAshtakavarga(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.SARVA_ASHTAKAVARGA, data);
    }

    async getShodashaVarga(data: BirthData) {
        return this.post(RAMAN_ENDPOINTS.SHODASHA_VARGA, data);
    }

    // =========================================================================
    // DASHA
    // =========================================================================

    async getMahaAntarDasha(data: BirthData) { return this.post(RAMAN_ENDPOINTS.MAHA_ANTAR_DASHA, data); }
    async getPratyantarDasha(data: BirthData) { return this.post(RAMAN_ENDPOINTS.PRATYANTAR_DASHA, data); }
    async getSookshmaDasha(data: BirthData) { return this.post(RAMAN_ENDPOINTS.SOOKSHMA_DASHA, data); }
    async getPranaDasha(data: BirthData) { return this.post(RAMAN_ENDPOINTS.PRANA_DASHA, data); }

    /**
     * Generic dasha getter with level and context
     */
    async getVimshottariDasha(data: BirthData, level: string = 'mahadasha', context: Record<string, string> = {}) {
        const ramanLevelMap: Record<string, string> = {
            'mahadasha': RAMAN_ENDPOINTS.MAHA_ANTAR_DASHA,
            'antardasha': RAMAN_ENDPOINTS.MAHA_ANTAR_DASHA,
            'pratyantardasha': RAMAN_ENDPOINTS.PRATYANTAR_DASHA,
            'sookshma': RAMAN_ENDPOINTS.SOOKSHMA_DASHA,
            'prana': RAMAN_ENDPOINTS.PRANA_DASHA
        };
        const endpoint = ramanLevelMap[level.toLowerCase()] || ramanLevelMap['mahadasha'];
        return this.post(endpoint, data, context);
    }
}

export const ramanClient = new RamanClient();

import { BaseAstroClient } from "./base.client";
import { BHASIN_ENDPOINTS } from "../constants/endpoints";
import { BirthData } from "../types/birth-data.types";

/**
 * Bhasin Ayanamsa Client
 * Endpoints: /bhasin/*
 */
export class BhasinClient extends BaseAstroClient {
    // Natal & Transit
    async getNatalChart(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.NATAL, data);
    }

    async getTransitChart(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.TRANSIT, data);
    }

    async getMoonChart(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.MOON_CHART, data);
    }

    async getSunChart(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.SUN_CHART, data);
    }

    async getSudarshanChakra(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.SUDARSHAN_CHAKRA, data);
    }

    async getShodashaVarga(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.SHODASHA_VARGA_SUMMARY, data);
    }

    // Divisional Charts
    async getDivisionalChart(data: BirthData, type: string) {
        const divisionalMap: Record<string, string> = {
            d2: BHASIN_ENDPOINTS.D2_HORA,
            d3: BHASIN_ENDPOINTS.D3_DREKKANA,
            d4: BHASIN_ENDPOINTS.D4_CHATURTHAMSHA,
            d7: BHASIN_ENDPOINTS.D7_SAPTAMSHA,
            d9: BHASIN_ENDPOINTS.D9_NAVAMSA,
            d10: BHASIN_ENDPOINTS.D10_DASAMSA,
            d12: BHASIN_ENDPOINTS.D12_DWADASAMSA,
            d16: BHASIN_ENDPOINTS.D16_SHODASAMSA,
            d20: BHASIN_ENDPOINTS.D20_VIMSHAMSA,
            d24: BHASIN_ENDPOINTS.D24_CHATURVIMSHAMSA,
            d27: BHASIN_ENDPOINTS.D27_SAPTAVIMSHAMSA,
            d30: BHASIN_ENDPOINTS.D30_TRIMSHAMSA,
            d40: BHASIN_ENDPOINTS.D40_KHAVEDAMSA,
            d45: BHASIN_ENDPOINTS.D45_AKSHAVEDAMSA,
            d60: BHASIN_ENDPOINTS.D60_SHASHTIAMSA,
        };

        const endpoint = divisionalMap[type.toLowerCase()] || `/bhasin/${type}`;
        return this.post(endpoint, data);
    }

    // Lagna & Bhava Charts
    async getArudhaLagna(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.ARUDHA_LAGNA, data);
    }

    async getBhavaLagna(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.BHAVA_LAGNA, data);
    }

    async getHoraLagna(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.HORA_LAGNA, data);
    }

    async getSripathiBhava(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.SRIPATHI_BHAVA, data);
    }

    async getKpBhava(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.KP_BHAVA, data);
    }

    async getEqualBhava(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.EQUAL_BHAVA, data);
    }

    async getGlChart(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.GL_CHART, data);
    }

    async getKarkamshaD1(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.KARKAMSHA_D1, data);
    }

    async getKarkamshaD9(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.KARKAMSHA_D9, data);
    }

    // Ashtakavarga
    async getBhinnaAshtakavarga(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.BHINNA_ASHTAKAVARGA, data);
    }

    async getSarvaAshtakavarga(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.SARVA_ASHTAKAVARGA, data);
    }

    // Dasha Systems
    async getVimshottariDasha(data: BirthData, level: string = "mahadasha") {
        const dashaMap: Record<string, string> = {
            mahadasha: BHASIN_ENDPOINTS.MAHA_ANTAR_DASHA,
            antardasha: BHASIN_ENDPOINTS.MAHA_ANTAR_DASHA,
            pratyantardasha: BHASIN_ENDPOINTS.PRATYANTAR_DASHA,
            sookshma: BHASIN_ENDPOINTS.SOOKSHMA_DASHA,
            prana: BHASIN_ENDPOINTS.PRANA_DASHA,
        };

        const endpoint = dashaMap[level.toLowerCase()] || dashaMap["mahadasha"];
        return this.post(endpoint, data);
    }

    async getAshtottariDasha(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.ASHTOTTARI_ANTAR, data);
    }

    async getAshtottariPratyantar(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.ASHTOTTARI_PD, data);
    }

    async getTribhagiDasha(data: BirthData) {
        return this.post(BHASIN_ENDPOINTS.TRIBHAGI, data);
    }
}

export const bhasinClient = new BhasinClient();

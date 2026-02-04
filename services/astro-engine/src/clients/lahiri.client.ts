import { BaseAstroClient } from './base.client';
import { BirthData, NumerologyData, SynastryData } from '../types';
import { LAHIRI_ENDPOINTS, DIVISIONAL_CHART_MAP } from '../constants';

// =============================================================================
// LAHIRI AYANAMSA CLIENT
// Handles all Lahiri system calculations (45+ endpoints)
// =============================================================================

export class LahiriClient extends BaseAstroClient {
    constructor() {
        super('lahiri-client');
    }

    // =========================================================================
    // NATAL & TRANSIT CHARTS
    // =========================================================================

    async getNatalChart(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.NATAL, data);
    }

    async getTransitChart(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.TRANSIT, data);
    }

    async getMoonChart(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.MOON_CHART, data);
    }

    async getSunChart(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.SUN_CHART, data);
    }

    async getSudarshanChakra(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.SUDARSHAN_CHAKRA, data);
    }

    // =========================================================================
    // DIVISIONAL CHARTS (D2-D60)
    // =========================================================================

    async getDivisionalChart(data: BirthData, chartType: string) {
        const endpoint = DIVISIONAL_CHART_MAP[chartType.toLowerCase()];
        return this.post(`/lahiri/${endpoint || chartType.toLowerCase()}`, data);
    }

    async getD2Hora(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D2_HORA, data); }
    async getD3Drekkana(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D3_DREKKANA, data); }
    async getD4Chaturthamsha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D4_CHATURTHAMSHA, data); }
    async getD7Saptamsha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D7_SAPTAMSHA, data); }
    async getD9Navamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D9_NAVAMSA, data); }
    async getD10Dasamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D10_DASAMSA, data); }
    async getD12Dwadasamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D12_DWADASAMSA, data); }
    async getD16Shodasamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D16_SHODASAMSA, data); }
    async getD20Vimshamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D20_VIMSHAMSA, data); }
    async getD24Chaturvimshamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D24_CHATURVIMSHAMSA, data); }
    async getD27Saptavimshamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D27_SAPTAVIMSHAMSA, data); }
    async getD30Trimshamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D30_TRIMSHAMSA, data); }
    async getD40Khavedamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D40_KHAVEDAMSA, data); }
    async getD45Akshavedamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D45_AKSHAVEDAMSA, data); }
    async getD60Shashtiamsa(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D60_SHASHTIAMSA, data); }
    async getD6Shashtamsha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D6_SHASHTAMSHA, data); }
    async getD150Nadiamsha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.D150_NADIAMSHA, data); }

    // =========================================================================
    // LAGNA CHARTS (Special Ascendants)
    // =========================================================================

    async getArudhaLagna(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.ARUDHA_LAGNA, data); }
    async getBhavaLagna(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.BHAVA_LAGNA, data); }
    async getHoraLagna(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.HORA_LAGNA, data); }
    async getSripathiBhava(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SRIPATHI_BHAVA, data); }
    async getKpBhava(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.KP_BHAVA, data); }
    async getEqualBhava(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.EQUAL_BHAVA, data); }
    async getKarkamshaD1(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.KARKAMSHA_D1, data); }
    async getKarkamshaD9(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.KARKAMSHA_D9, data); }

    async getMandi(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.MANDI, data);
    }

    async getGulika(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.GULIKA, data);
    }

    // =========================================================================
    // ASHTAKAVARGA
    // =========================================================================

    async getBhinnaAshtakavarga(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.BHINNA_ASHTAKAVARGA, data);
    }

    async getSarvaAshtakavarga(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.SARVA_ASHTAKAVARGA, data);
    }

    async getShodashaVarga(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.SHODASHA_VARGA_SUMMARY, data);
    }

    // =========================================================================
    // DASHA
    // =========================================================================

    async getAntarDasha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.ANTAR_DASHA, data); }
    async getPratyantarDasha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.PRATYANTAR_DASHA, data); }
    async getSookshmaDasha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SOOKSHMA_DASHA, data); }
    async getPranaDasha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.PRANA_DASHA, data); }

    /**
     * Generic dasha getter with level and context
     */
    async getVimshottariDasha(data: BirthData, level: string = 'mahadasha', context: Record<string, string> = {}) {
        const lahiriLevelMap: Record<string, string> = {
            'mahadasha': LAHIRI_ENDPOINTS.ANTAR_DASHA,
            'antardasha': LAHIRI_ENDPOINTS.ANTAR_DASHA,
            'pratyantardasha': LAHIRI_ENDPOINTS.PRATYANTAR_DASHA,
            'sookshma': LAHIRI_ENDPOINTS.SOOKSHMA_DASHA,
            'prana': LAHIRI_ENDPOINTS.PRANA_DASHA
        };
        const endpoint = lahiriLevelMap[level.toLowerCase()] || lahiriLevelMap['mahadasha'];
        return this.post(endpoint, data, context);
    }

    // =========================================================================
    // COMPATIBILITY & NUMEROLOGY
    // =========================================================================

    async getSynastry(data: SynastryData) {
        const payload = {
            person1: this.buildPayload(data.person1),
            person2: this.buildPayload(data.person2),
        };
        const response = await this.client.post(LAHIRI_ENDPOINTS.SYNASTRY, payload);
        return response.data;
    }

    async getComposite(data: SynastryData) {
        const payload = {
            person1: this.buildPayload(data.person1),
            person2: this.buildPayload(data.person2),
        };
        const response = await this.client.post(LAHIRI_ENDPOINTS.COMPOSITE, payload);
        return response.data;
    }

    async getChaldeanNumerology(data: NumerologyData) {
        return this.post(LAHIRI_ENDPOINTS.CHALDEAN_NUMEROLOGY, data, { name: data.name });
    }

    async getLoShuGrid(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.LO_SHU_GRID, data);
    }

    async getPersonNumerology(data: BirthData) {
        return this.post(LAHIRI_ENDPOINTS.PERSON_NUMEROLOGY, data);
    }

    async getGunaMilan(data: SynastryData) {
        const payload = {
            person1: this.buildPayload(data.person1),
            person2: this.buildPayload(data.person2),
        };
        return this.client.post(LAHIRI_ENDPOINTS.GUNA_MILAN, payload).then(res => res.data);
    }

    // =========================================================================
    // YOGAS
    // =========================================================================

    async getGajaKesariYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.GAJA_KESARI_YOGA, data); }
    async getGuruMangalYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.GURU_MANGAL_YOGA, data); }
    async getBudhaAdityaYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.BUDHA_ADITYA_YOGA, data); }
    async getChandraMangalYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.CHANDRA_MANGAL_YOGA, data); }
    async getRajYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.RAJ_YOGA, data); }
    async getPanchaMahapurushaYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.PANCHA_MAHAPURUSHA_YOGA, data); }
    async getDaridraYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DARIDRA_YOGA, data); }
    async getDhanYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DHAN_YOGA, data); }
    async getMaleficYogas(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.MALEFIC_YOGAS, data); }
    async getYogaAnalysis(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.YOGA_ANALYSIS, data); }
    async getSpecialYogas(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SPECIAL_YOGAS, data); }
    async getSpiritualYogas(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SPIRITUAL_YOGAS, data); }
    async getShubhYogas(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SHUBH_YOGAS, data); }
    async getKalpadrumaYoga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.KALPADRUMA_YOGA, data); }
    async getKalaSarpaDosha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.KALA_SARPA_DOSHA, data); }

    // =========================================================================
    // DOSHAS & REMEDIES
    // =========================================================================

    async getAngarakDosha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.ANGARAK_DOSHA, data); }
    async getGuruChandalDosha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.GURU_CHANDAL_DOSHA, data); }
    async getShrapitDosha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SHRAPIT_DOSHA, data); }
    async getSadeSati(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SADE_SATI, data); }
    async getPitraDosha(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.PITRA_DOSHA, data); }

    async getYantraRemedies(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.YANTRA_REMEDIES, data); }
    async getMantraRemedies(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.MANTRA_REMEDIES, data); }
    async getVedicRemedies(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.VEDIC_REMEDIES, data); }
    async getGemstoneRemedies(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.GEMSTONE_REMEDIES, data); }
    async getLalKitabRemedies(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.LAL_KITAB_REMEDIES, data); }

    // =========================================================================
    // PANCHANGA
    // =========================================================================

    async getPanchanga(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.PANCHANGA, data); }
    async getChoghadiya(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.CHOGHADIYA, data); }
    async getHoraTimes(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.HORA_TIMES, data); }
    async getLagnaTimes(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.LAGNA_TIMES, data); }
    async getMuhurat(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.MUHURAT, data); }

    // =========================================================================
    // EXTENDED DASHAS
    // =========================================================================

    async getAshtottariAntar(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.ASHTOTTARI_ANTAR, data); }
    async getAshtottariPratyantar(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.ASHTOTTARI_PRATYANTAR, data); }
    async getTribhagi(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.TRIBHAGI, data); }
    async getTribhagi40(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.TRIBHAGI_40, data); }
    async getShodashottari(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SHODASHOTTARI, data); }
    async getDwadashottari(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DWADASHOTTARI, data); }
    async getChaturshitisama(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.CHATURSHITISAMA, data); }
    async getSatabdika(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SATABDIKA, data); }
    async getPanchottari(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.PANCHOTTARI, data); }
    async getDwisaptati(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DWISAPTATI, data); }
    async getShastihayani(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SHASTIHAYANI, data); }
    async getShattrimshatsama(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.SHATTRIMSHATSAMA, data); }

    async getDasha3Months(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DASHA_3MONTHS, data); }
    async getDasha6Months(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DASHA_6MONTHS, data); }
    async getDashaReport1Year(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DASHA_REPORT_1YEAR, data); }
    async getDashaReport2Years(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DASHA_REPORT_2YEARS, data); }
    async getDashaReport3Years(data: BirthData) { return this.post(LAHIRI_ENDPOINTS.DASHA_REPORT_3YEARS, data); }
}

export const lahiriClient = new LahiriClient();

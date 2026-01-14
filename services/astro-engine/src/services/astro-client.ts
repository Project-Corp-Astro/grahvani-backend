import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from '../config/logger';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface BirthData {
    birthDate: string;      // YYYY-MM-DD
    birthTime: string;      // HH:MM:SS
    latitude: number;
    longitude: number;
    timezoneOffset: number;
    userName?: string;      // Optional user identifier
    system?: 'lahiri' | 'kp' | 'raman';
    ayanamsa?: 'lahiri' | 'kp' | 'raman'; // Alias for compatibility
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
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        this.client.interceptors.request.use(
            (request: InternalAxiosRequestConfig) => {
                logger.info({ url: request.url, method: request.method }, 'Astro Engine API request');
                return request;
            },
            (error: AxiosError) => {
                logger.error({ error: error.message }, 'Request interceptor error');
                return Promise.reject(error);
            }
        );

        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.info({ url: response.config.url, status: response.status }, 'Astro Engine API response');
                return response;
            },
            (error: AxiosError) => {
                logger.error({
                    url: error.config?.url,
                    status: error.response?.status,
                    message: error.message
                }, 'Astro Engine API error');
                throw error;
            }
        );
    }

    /**
     * Get the resolved ayanamsa system from birth data (handles aliases)
     */
    private getSystem(data: BirthData): 'lahiri' | 'kp' | 'raman' {
        return data.system || data.ayanamsa || 'lahiri';
    }

    /**
     * Build payload for external API (converts camelCase to snake_case)
     */
    private buildPayload(data: BirthData, extras: Record<string, any> = {}): Record<string, any> {
        return {
            user_name: data.userName || 'grahvani_client',
            birth_date: data.birthDate,
            birth_time: data.birthTime,
            latitude: String(data.latitude),
            longitude: String(data.longitude),
            timezone_offset: data.timezoneOffset,
            system: this.getSystem(data), // Explicitly pass resolved system to Python
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
        const system = this.getSystem(data);
        const endpoint = system === 'kp' ? '/kp/cusps_chart' : `/${system}/natal`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Generate Transit Chart
     */
    async getTransitChart(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = `/${system}/transit`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Moon Chart
     */
    async getMoonChart(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = `/${system}/calculate_moon_chart`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Sun Chart
     */
    async getSunChart(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = `/${system}/calculate_sun_chart`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Sudarshan Chakra
     */
    async getSudarshanChakra(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = `/${system}/calculate_sudarshan_chakra`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    // =========================================================================
    // DIVISIONAL CHARTS (D2-D60)
    // =========================================================================

    /**
     * Generate Divisional Chart
     */
    async getDivisionalChart(data: BirthData, chartType: string): Promise<any> {
        const system = this.getSystem(data);
        const type = chartType.toLowerCase();

        // KP divisional routing (not supported, fallback or error)
        if (system === 'kp') {
            throw new Error('Divisional charts (D2-D60) are not supported in the KP system. Please use Lahiri or Raman.');
        }

        // System-aware endpoint mappings
        const systemMappings: Record<string, Record<string, string>> = {
            'raman': {
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
            },
            'lahiri': {
                'd2': 'calculate_d2_hora',
                'd3': 'calculate_d3',
                'd4': 'calculate_d4',
                'd7': 'calculate_d7_chart',
                'd9': 'navamsa',
                'd10': 'calculate_d10',
                'd12': 'calculate_d12',
                'd16': 'calculate_d16',
                'd20': 'calculate_d20',
                'd24': 'calculate_d24',
                'd27': 'calculate_d27',
                'd30': 'calculate_d30',
                'd40': 'calculate_d40',
                'd45': 'calculate_d45',
                'd60': 'calculate_d60',
            }
        };

        const endpointPath = systemMappings[system]?.[type] || type;
        const endpoint = `/${system}/${endpointPath}`;

        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    // =========================================================================
    // KP SYSTEM
    // =========================================================================

    /**
     * Get KP Planets and Cusps with sub-lords
     */
    async getKpPlanetsCusps(data: BirthData): Promise<any> {
        const endpoint = '/kp/cusps_chart';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Ruling Planets
     */
    async getRulingPlanets(data: BirthData): Promise<any> {
        const endpoint = '/kp/ruling-planets';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Bhava Details
     */
    async getBhavaDetails(data: BirthData): Promise<any> {
        const endpoint = '/kp/calculate_bhava_details';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get House Significations
     */
    async getSignifications(data: BirthData): Promise<any> {
        const endpoint = '/kp/calculate_significations';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * KP Horary Analysis
     */
    async getKpHorary(data: HoraryData): Promise<any> {
        const endpoint = '/kp/kp_horary';

        const payload = {
            horary_number: data.horaryNumber,
            date: data.birthDate,
            time: data.birthTime,
            latitude: String(data.latitude),
            longitude: String(data.longitude),
            tz_offset: data.timezoneOffset,
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
    async getVimshottariDasha(data: BirthData, level: string = 'mahadasha'): Promise<any> {
        const system = this.getSystem(data);
        let endpoint = '';

        if (system === 'raman') {
            const ramanEndpoints: Record<string, string> = {
                'mahadasha': '/raman/calculate_maha_antar_dashas',
                'antardasha': '/raman/calculate_maha_antar_dashas',
                'pratyantardasha': '/raman/calculate_maha_antar_pratyantar_dasha',
                'sookshma': '/raman/calculate_sookshma_dasha_raman',
                'prana': '/raman/calculate_raman_prana_dasha'
            };
            endpoint = ramanEndpoints[level.toLowerCase()] || ramanEndpoints['mahadasha'];
        } else if (system === 'kp') {
            const kpEndpoints: Record<string, string> = {
                'mahadasha': '/kp/calculate_maha_antar_dasha',
                'antardasha': '/kp/calculate_maha_antar_dasha',
                'pratyantardasha': '/kp/calculate_maha_antar_pratyantar_dasha',
                'sookshma': '/kp/calculate_maha_antar_pratyantar_sooksha_dasha',
                'prana': '/kp/calculate_maha_antar_pratyantar_pran_dasha'
            };
            endpoint = kpEndpoints[level.toLowerCase()] || kpEndpoints['mahadasha'];
        } else {
            // Lahiri/Default
            const lahiriEndpoints: Record<string, string> = {
                'mahadasha': '/lahiri/calculate_antar_dasha',
                'antardasha': '/lahiri/calculate_antar_dasha',
                'pratyantardasha': '/lahiri/prathythar_dasha_lahiri',
                'sookshma': '/lahiri/calculate_antar_pratyantar_sookshma_dasha',
                'prana': '/lahiri/calculate_sookshma_prana_dashas'
            };
            endpoint = lahiriEndpoints[level.toLowerCase()] || lahiriEndpoints['mahadasha'];
        }

        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Lahiri Dasha (Antar level)
     */
    async getLahiriAntarDasha(data: BirthData): Promise<any> {
        const endpoint = '/lahiri/calculate_antar_dasha';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    // =========================================================================
    // ASHTAKAVARGA
    // =========================================================================

    /**
     * Get Bhinna Ashtakavarga (individual planets)
     */
    async getBhinnaAshtakavarga(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = system === 'raman'
            ? '/raman/calculate_bhinnashtakavarga'
            : '/lahiri/calculate_binnatakvarga';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Sarva Ashtakavarga (combined)
     */
    async getSarvaAshtakavarga(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = system === 'raman'
            ? '/raman/calculate_sarvashtakavarga'
            : '/lahiri/calculate_sarvashtakavarga';
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Shodasha Varga Summary (16 divisional chart signs)
     */
    async getShodashaVargaSummary(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = system === 'raman'
            ? '/raman/shodasha_varga_signs'
            : '/lahiri/shodasha_varga_summary';
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
        const system = this.getSystem(data);
        const endpoint = `/${system}/calculate_arudha_lagna`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Bhava Lagna
     */
    async getBhavaLagna(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = `/${system}/calculate_bhava_lagna`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Hora Lagna
     */
    async getHoraLagna(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
        const endpoint = `/${system}/calculate_hora_lagna`;
        const response = await this.client.post(endpoint, this.buildPayload(data));
        return response.data;
    }

    /**
     * Get Sripathi Bhava
     */
    async getSripathiBhava(data: BirthData): Promise<any> {
        const system = this.getSystem(data);
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
        const endpoint = '/lahiri/synastry';
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
    async getChaldeanNumerology(data: BirthData & { name: string }): Promise<any> {
        const endpoint = '/lahiri/chaldean_numerology';
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
    async getProgressedChart(data: BirthData, progressedDate: string): Promise<any> {
        const system = this.getSystem(data);
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
    async getCompositeChart(person1: BirthData, person2: BirthData): Promise<any> {
        const endpoint = '/lahiri/composite';
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
        const endpoint = '/lahiri/lo_shu_grid_numerology';
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
            const response = await this.client.get('/health', { timeout: 5000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

export const astroEngineClient = new AstroEngineClient();

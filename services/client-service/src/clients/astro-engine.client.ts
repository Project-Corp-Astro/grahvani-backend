import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../config';

// =============================================================================
// Types & Interfaces
// =============================================================================

export type Ayanamsa = 'lahiri' | 'raman' | 'kp';

export interface BirthData {
    birthDate: string;      // YYYY-MM-DD
    birthTime: string;      // HH:MM:SS
    latitude: number;
    longitude: number;
    timezoneOffset: number;
    userName?: string;
}

export interface AstroResponse<T = any> {
    success: boolean;
    data: T;
    cached: boolean;
    calculatedAt: string;
}

// =============================================================================
// Error Classes
// =============================================================================

export class AstroEngineError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 500,
        public readonly code: string = 'ASTRO_ENGINE_ERROR'
    ) {
        super(message);
        this.name = 'AstroEngineError';
    }
}

export class AstroEngineUnavailableError extends AstroEngineError {
    constructor() {
        super('Astro Engine service is unavailable', 503, 'ASTRO_ENGINE_UNAVAILABLE');
    }
}

// =============================================================================
// Ayanamsa-Aware Astro Engine Client
// Routes requests to correct endpoints based on selected Ayanamsa system
// =============================================================================

class AstroEngineClient {
    private internalClient: AxiosInstance; // For /internal/* (Lahiri default)
    private apiClient: AxiosInstance;      // For /api/* (Raman, KP, etc.)
    private readonly baseURL: string;

    constructor() {
        this.baseURL = process.env.ASTRO_ENGINE_URL || 'http://localhost:3014';

        // Client for internal routes (Lahiri - backward compatible)
        this.internalClient = axios.create({
            baseURL: `${this.baseURL}/internal`,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Name': 'client-service',
            },
        });

        // Client for API routes (Raman, KP, Compatibility)
        this.apiClient = axios.create({
            baseURL: `${this.baseURL}/api`,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Name': 'client-service',
            },
        });

        this.setupInterceptors(this.internalClient);
        this.setupInterceptors(this.apiClient);
    }

    private setupInterceptors(client: AxiosInstance): void {
        client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                logger.info({ url: config.url, method: config.method }, 'Astro Engine request');
                return config;
            },
            (error: AxiosError) => Promise.reject(error)
        );

        client.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.info({ url: response.config.url, status: response.status }, 'Astro Engine response');
                return response;
            },
            (error: AxiosError) => this.handleError(error)
        );
    }

    private handleError(error: AxiosError): never {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new AstroEngineUnavailableError();
        }
        const message = (error.response?.data as any)?.error || error.message;
        throw new AstroEngineError(message, error.response?.status || 500);
    }

    // =========================================================================
    // AYANAMSA-AWARE CHART METHODS
    // Automatically routes to correct endpoints based on Ayanamsa selection
    // =========================================================================

    /**
     * Get Natal Chart (D1) for any Ayanamsa system
     */
    async getNatalChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa }, 'Generating natal chart');

        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/natal', birthData)).data;
            case 'kp':
                // KP uses internal client for now
                return (await this.internalClient.post('/natal', birthData)).data;
            case 'lahiri':
            default:
                return (await this.internalClient.post('/natal', birthData)).data;
        }
    }

    /**
     * Get Transit Chart for any Ayanamsa system
     */
    async getTransitChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa }, 'Generating transit chart');

        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/transit', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/transit', birthData)).data;
        }
    }

    /**
     * Get Divisional Chart (D2-D60) for any Ayanamsa system
     */
    async getDivisionalChart(birthData: BirthData, chartType: string, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa, chartType }, 'Generating divisional chart');

        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post(`/raman/divisional/${chartType}`, birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post(`/divisional/${chartType}`, birthData)).data;
        }
    }

    /**
     * Get Moon Chart for any Ayanamsa system
     */
    async getMoonChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/moon', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/moon-chart', birthData)).data;
        }
    }

    /**
     * Get Sun Chart for any Ayanamsa system
     */
    async getSunChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/sun', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/sun-chart', birthData)).data;
        }
    }

    /**
     * Get Sudarshan Chakra for any Ayanamsa system
     */
    async getSudarshanChakra(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/sudarshan-chakra', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/sudarshan-chakra', birthData)).data;
        }
    }

    // =========================================================================
    // DASHA ENDPOINTS (Ayanamsa-aware)
    // =========================================================================

    /**
     * Get Vimshottari Dasha for any Ayanamsa system
     */
    async getVimshottariDasha(birthData: BirthData, level: string = 'mahadasha', ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa, level }, 'Generating Vimshottari Dasha');

        switch (ayanamsa) {
            case 'raman':
                // Map level to Raman endpoint
                const ramanEndpoint = this.getRamanDashaEndpoint(level);
                return (await this.apiClient.post(`/raman/dasha/${ramanEndpoint}`, birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post(`/dasha/vimshottari?level=${level}`, birthData)).data;
        }
    }

    private getRamanDashaEndpoint(level: string): string {
        const mapping: Record<string, string> = {
            'mahadasha': 'maha-antar',
            'antardasha': 'maha-antar',
            'pratyantardasha': 'pratyantar',
            'sookshmadasha': 'sookshma',
            'pranadasha': 'prana',
        };
        return mapping[level.toLowerCase()] || 'maha-antar';
    }

    async getPranaDasha(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/dasha/prana', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/dasha/prana', birthData)).data;
        }
    }

    // =========================================================================
    // ASHTAKAVARGA ENDPOINTS (Ayanamsa-aware)
    // =========================================================================

    async getAshtakavarga(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/bhinna-ashtakavarga', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/ashtakavarga', birthData)).data;
        }
    }

    async getSarvaAshtakavarga(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/sarva-ashtakavarga', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/sarva-ashtakavarga', birthData)).data;
        }
    }

    async getShodashaVarga(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        switch (ayanamsa) {
            case 'raman':
                return (await this.apiClient.post('/raman/shodasha-varga', birthData)).data;
            case 'kp':
            case 'lahiri':
            default:
                return (await this.internalClient.post('/shodasha-varga', birthData)).data;
        }
    }

    // =========================================================================
    // LAGNA CHARTS (Raman-specific, available for all)
    // =========================================================================

    async getArudhaLagna(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/arudha-lagna', birthData)).data;
        }
        return (await this.apiClient.post('/charts/arudha-lagna', birthData)).data;
    }

    async getBhavaLagna(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/bhava-lagna', birthData)).data;
        }
        return (await this.apiClient.post('/charts/bhava-lagna', birthData)).data;
    }

    async getHoraLagna(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/hora-lagna', birthData)).data;
        }
        return (await this.apiClient.post('/charts/hora-lagna', birthData)).data;
    }

    // =========================================================================
    // KP SYSTEM SPECIFIC ENDPOINTS
    // =========================================================================

    async getKpPlanetsCusps(birthData: BirthData): Promise<AstroResponse> {
        return (await this.apiClient.post('/kp/planets-cusps', birthData)).data;
    }

    async getRulingPlanets(birthData: BirthData): Promise<AstroResponse> {
        return (await this.apiClient.post('/kp/ruling-planets', birthData)).data;
    }

    async getBhavaDetails(birthData: BirthData): Promise<AstroResponse> {
        return (await this.apiClient.post('/kp/bhava-details', birthData)).data;
    }

    async getSignifications(birthData: BirthData): Promise<AstroResponse> {
        return (await this.apiClient.post('/kp/significations', birthData)).data;
    }

    async getKpHorary(birthData: BirthData & { horaryNumber: number; question: string }): Promise<AstroResponse> {
        return (await this.apiClient.post('/kp/horary', birthData)).data;
    }

    // =========================================================================
    // COMPATIBILITY ENDPOINTS
    // =========================================================================

    async getSynastry(person1: BirthData, person2: BirthData): Promise<AstroResponse> {
        return (await this.apiClient.post('/compatibility/synastry', { person1, person2 })).data;
    }

    async getComposite(person1: BirthData, person2: BirthData): Promise<AstroResponse> {
        return (await this.apiClient.post('/compatibility/composite', { person1, person2 })).data;
    }

    async getProgressed(birthData: BirthData & { progressedDate: string }): Promise<AstroResponse> {
        return (await this.apiClient.post('/compatibility/progressed', birthData)).data;
    }

    // =========================================================================
    // BULK CHART GENERATION (For Workbench)
    // =========================================================================

    /**
     * Generate multiple charts at once for workbench display
     */
    async generateWorkbenchCharts(
        birthData: BirthData,
        ayanamsa: Ayanamsa = 'lahiri',
        chartTypes: string[] = ['D1', 'D9', 'D10', 'D12']
    ): Promise<Record<string, AstroResponse>> {
        logger.info({ ayanamsa, chartTypes }, 'Generating workbench charts bundle');

        const results: Record<string, AstroResponse> = {};

        // Generate all charts in parallel
        const promises = chartTypes.map(async (chartType) => {
            try {
                if (chartType === 'D1' || chartType.toLowerCase() === 'natal') {
                    results[chartType] = await this.getNatalChart(birthData, ayanamsa);
                } else {
                    results[chartType] = await this.getDivisionalChart(birthData, chartType, ayanamsa);
                }
            } catch (error) {
                logger.error({ chartType, error }, 'Failed to generate chart');
                results[chartType] = { success: false, data: null, cached: false, calculatedAt: '' };
            }
        });

        await Promise.all(promises);
        return results;
    }

    // =========================================================================
    // HEALTH CHECK
    // =========================================================================

    async isHealthy(): Promise<boolean> {
        try {
            const response = await this.internalClient.get('/health', {
                baseURL: this.baseURL,
                timeout: 5000
            });
            return response.data?.status === 'ok' || response.data?.status === 'healthy';
        } catch {
            return false;
        }
    }
}

export const astroEngineClient = new AstroEngineClient();


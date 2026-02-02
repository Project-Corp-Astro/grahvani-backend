import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../config';
import { BaseError } from '../errors/client.errors';

// =============================================================================
// Types & Interfaces
// =============================================================================

export type Ayanamsa = 'lahiri' | 'raman' | 'kp' | 'yukteswar' | 'western';

export interface BirthData {
    birthDate: string;      // YYYY-MM-DD
    birthTime: string;      // HH:MM:SS
    latitude: number;
    longitude: number;
    timezoneOffset: number;
    userName?: string;
    ayanamsa?: Ayanamsa;    // Standardized: 'lahiri' | 'raman' | 'kp' | 'yukteswar' | 'western'
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

export class AstroEngineError extends BaseError {
    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'ASTRO_ENGINE_ERROR'
    ) {
        super(message, statusCode, code);
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

import * as http from 'http';
import * as https from 'https';

class AstroEngineClient {
    private internalClient: AxiosInstance; // For /internal/* (Lahiri default)
    private apiClient: AxiosInstance;      // For /api/* (Raman, KP, etc.)
    private readonly baseURL: string;

    constructor() {
        this.baseURL = process.env.ASTRO_ENGINE_URL || 'http://localhost:3014';

        // Use persistent connections to avoid exhaustion
        const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5 });
        const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5 });

        // Client for internal routes (Lahiri - backward compatible)
        this.internalClient = axios.create({
            baseURL: `${this.baseURL}/internal`,
            timeout: 60000,
            httpAgent,
            httpsAgent,
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Name': 'client-service',
            },
        });

        // Client for API routes (Raman, KP, Compatibility)
        this.apiClient = axios.create({
            baseURL: `${this.baseURL}/api`,
            timeout: 60000,
            httpAgent,
            httpsAgent,
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
            async (error: AxiosError) => {
                const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };

                // Retry conditions: 503 (Service Unavailable), 504 (Gateway Timeout), Network Errors
                const shouldRetry =
                    config &&
                    !config._retryCount || (config._retryCount || 0) < 3 &&
                    (
                        (error.response && (error.response.status === 503 || error.response.status === 504)) ||
                        error.code === 'ECONNREFUSED' ||
                        error.code === 'ETIMEDOUT'
                    );

                if (shouldRetry) {
                    config._retryCount = (config._retryCount || 0) + 1;
                    const delay = Math.pow(2, config._retryCount) * 1000; // 2s, 4s, 8s

                    logger.warn({
                        url: config.url,
                        attempt: config._retryCount,
                        delay,
                        error: error.message
                    }, 'Astro Engine unavailable - Retrying...');

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return client(config);
                }

                return this.handleError(error);
            }
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
        logger.info({ ayanamsa }, 'Generating natal chart via proxy');
        // The proxy now handles system routing internally for the /natal endpoint
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/natal', payload)).data;
    }

    /**
     * Get Transit Chart for any Ayanamsa system
     */
    async getTransitChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa }, 'Generating transit chart via proxy');
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/transit', payload)).data;
    }

    /**
     * Get Divisional Chart (D2-D60) for any Ayanamsa system
     */
    async getDivisionalChart(birthData: BirthData, chartType: string, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa, chartType }, 'Generating divisional chart via proxy');
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post(`/divisional/${chartType}`, payload)).data;
    }

    /**
     * Get Moon Chart for any Ayanamsa system
     */
    async getMoonChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/moon-chart', payload)).data;
    }

    /**
     * Get Sun Chart for any Ayanamsa system
     */
    async getSunChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/sun-chart', payload)).data;
    }

    /**
     * Get Sudarshan Chakra for any Ayanamsa system
     */
    async getSudarshanChakra(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/sudarshan-chakra', payload)).data;
    }

    // =========================================================================
    // DASHA ENDPOINTS (Ayanamsa-aware)
    // =========================================================================

    /**
     * Get Vimshottari Dasha for any Ayanamsa system
     */
    async getVimshottariDasha(
        birthData: BirthData,
        level: string = 'mahadasha',
        context: { mahaLord?: string; antarLord?: string; pratyantarLord?: string; sookshmaLord?: string } = {}
    ): Promise<AstroResponse> {
        logger.info({ ayanamsa: birthData.ayanamsa, level }, 'Generating Vimshottari Dasha');
        const payload = { ...birthData };

        // Use URLSearchParams for clean query string construction
        const params = new URLSearchParams();
        params.append('level', level);
        if (context.mahaLord) params.append('mahaLord', context.mahaLord);
        if (context.antarLord) params.append('antarLord', context.antarLord);
        if (context.pratyantarLord) params.append('pratyantarLord', context.pratyantarLord);
        if (context.sookshmaLord) params.append('sookshmaLord', context.sookshmaLord);

        return (await this.internalClient.post(`/dasha/vimshottari?${params.toString()}`, payload)).data;
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

    /**
     * Generate alternative Dasha systems (non-Vimshottari)
     * @param birthData Birth data for the native
     * @param dashaType Type of dasha system (tribhagi, tribhagi-40, shodashottari, dwadashottari, etc.)
     * @returns Dasha calculation result
     */
    async getAlternativeDasha(birthData: BirthData, dashaType: string): Promise<AstroResponse> {
        logger.info({ ayanamsa: birthData.ayanamsa, dashaType }, 'Generating Alternative Dasha');
        const payload = { ...birthData };

        // Normalize dasha type name (remove -dasha suffix if present)
        const normalizedType = dashaType.replace(/-dasha$/, '').toLowerCase();

        // Use URLSearchParams for clean query string construction
        const params = new URLSearchParams();
        params.append('type', normalizedType);

        try {
            return (await this.internalClient.post(`/dasha/other?${params.toString()}`, payload)).data;
        } catch (error) {
            logger.error({ dashaType, error }, 'Alternative dasha generation failed');
            throw new AstroEngineError(`Failed to generate ${dashaType}`, 500);
        }
    }

    /**
     * Get Other Dasha Systems (Tribhagi, Shodashottari, Dwadashottari, etc.)
     * Routes to /internal/dasha/other?type=<dashaType>
     */
    async getOtherDasha(birthData: BirthData, dashaType: string, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        logger.info({ ayanamsa, dashaType }, 'Generating Other Dasha');
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post(`/dasha/other?type=${dashaType}`, payload)).data;
    }

    // =========================================================================
    // ASHTAKAVARGA ENDPOINTS (Ayanamsa-aware)
    // =========================================================================

    async getAshtakavarga(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'kp') {
            throw new Error('Ashtakavarga is not available for KP system');
        }

        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/ashtakavarga', payload)).data;
    }

    async getSarvaAshtakavarga(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'kp') {
            throw new Error('Sarva Ashtakavarga is not available for KP system');
        }

        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/sarva-ashtakavarga', payload)).data;
    }

    async getShodashaVarga(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'kp') {
            throw new Error('Shodasha Varga is not available for KP system');
        }

        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/shodasha-varga', payload)).data;
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

    async getYogaAnalysis(birthData: BirthData, yogaType: string, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post(`/yoga/${yogaType}`, payload)).data;
    }

    async getDoshaAnalysis(birthData: BirthData, doshaType: string, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post(`/dosha/${doshaType}`, payload)).data;
    }

    async getRemedy(birthData: BirthData, remedyType: string, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post(`/remedy/${remedyType}`, payload)).data;
    }

    async getPanchanga(birthData: BirthData, type: string = 'panchanga', ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post(`/panchanga/${type}`, payload)).data;
    }

    async getShadbala(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        const payload = { ...birthData, ayanamsa: ayanamsa };
        return (await this.internalClient.post('/shadbala', payload)).data;
    }

    async getSripathiBhava(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/sripathi-bhava', birthData)).data;
        }
        return (await this.apiClient.post('/charts/sripathi-bhava', birthData)).data;
    }

    async getKpBhava(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/kp-bhava', birthData)).data;
        }
        return (await this.apiClient.post('/charts/kp-bhava', birthData)).data;
    }

    async getEqualBhava(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/equal-bhava', birthData)).data;
        }
        return (await this.apiClient.post('/charts/equal-bhava', birthData)).data;
    }

    async getEqualChart(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        return (await this.internalClient.post(`/special/equal_chart`, { ...birthData, ayanamsa: ayanamsa })).data;
    }

    async getKarkamshaD1(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/karkamsha-d1', birthData)).data;
        }
        return (await this.apiClient.post('/charts/karkamsha-d1', birthData)).data;
    }

    async getKarkamshaD9(birthData: BirthData, ayanamsa: Ayanamsa = 'lahiri'): Promise<AstroResponse> {
        if (ayanamsa === 'raman') {
            return (await this.apiClient.post('/raman/karkamsha-d9', birthData)).data;
        }
        return (await this.apiClient.post('/charts/karkamsha-d9', birthData)).data;
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

    async getChaldeanNumerology(data: any): Promise<AstroResponse> {
        return (await this.apiClient.post('/numerology/chaldean', data)).data;
    }

    async getLoShuGrid(birthData: any): Promise<AstroResponse> {
        return (await this.apiClient.post('/numerology/loshu', birthData)).data;
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


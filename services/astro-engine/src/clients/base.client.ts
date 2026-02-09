import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from '../config/logger';
import { BirthData } from '../types';

// =============================================================================
// BASE CLIENT - Shared HTTP functionality for all Ayanamsa clients
// =============================================================================

export class BaseAstroClient {
    protected client: AxiosInstance;
    protected readonly serviceName: string;

    constructor(serviceName: string = 'astro-engine') {
        this.serviceName = serviceName;

        this.client = axios.create({
            baseURL: config.astroEngineUrl,
            timeout: 60000, // 60 seconds for complex calculations
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Name': 'grahvani-proxy',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // Request logging
        this.client.interceptors.request.use(
            (request: InternalAxiosRequestConfig) => {
                const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                request.headers.set('X-Request-ID', requestId);

                logger.info({
                    url: request.url,
                    method: request.method,
                    service: this.serviceName,
                    requestId
                }, 'External API request');

                return request;
            },
            (error: AxiosError) => {
                logger.error({
                    error: error.message,
                    service: this.serviceName
                }, 'Request interceptor error');
                return Promise.reject(error);
            }
        );

        // Response logging
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.info({
                    url: response.config.url,
                    status: response.status,
                    service: this.serviceName
                }, 'External API response');
                return response;
            },
            (error: AxiosError) => {
                logger.error({
                    url: error.config?.url,
                    status: error.response?.status,
                    message: error.message,
                    service: this.serviceName
                }, 'External API error');
                throw error;
            }
        );
    }

    /**
     * Build standard payload for external API
     * Converts camelCase to snake_case for Python API
     */
    protected buildPayload(data: BirthData, extras: Record<string, any> = {}): Record<string, any> {
        return {
            user_name: data.userName || 'grahvani_client',
            birth_date: data.birthDate,
            birth_time: data.birthTime,
            latitude: String(data.latitude),
            longitude: String(data.longitude),
            timezone_offset: data.timezoneOffset,
            ayanamsa: data.ayanamsa || 'lahiri',
            ...extras,
        };
    }

    /**
     * Build payload specifically for Universal Panchanga routes (using Python's new field names)
     * Python engine expects: date, time, latitude, longitude, timezone
     */
    protected buildUniversalPanchangaPayload(data: BirthData): Record<string, any> {
        return {
            date: data.birthDate,
            time: data.birthTime,
            latitude: String(data.latitude),
            longitude: String(data.longitude),
            timezone: data.timezone || 'UTC',
        };
    }

    /**
     * Execute POST request to external API
     */
    protected async post<T = any>(endpoint: string, data: BirthData, extras: Record<string, any> = {}): Promise<T> {
        const payload = this.buildPayload(data, extras);
        const response = await this.client.post<T>(endpoint, payload);
        return response.data;
    }

    /**
     * Execute POST request using Universal Panchanga payload format
     */
    protected async postUniversal<T = any>(endpoint: string, data: BirthData): Promise<T> {
        const payload = this.buildUniversalPanchangaPayload(data);
        const response = await this.client.post<T>(endpoint, payload);
        return response.data;
    }

    /**
     * Execute GET request
     */
    protected async get<T = any>(endpoint: string): Promise<T> {
        const response = await this.client.get<T>(endpoint);
        return response.data;
    }

    /**
     * Health check
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

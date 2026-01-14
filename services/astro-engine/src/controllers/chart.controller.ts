import { Request, Response } from 'express';
import { astroEngineClient, BirthData } from '../services/astro-client';
import { cacheService } from '../services/cache.service';
import { logger } from '../config/logger';

export class ChartController {
    /**
     * POST /internal/natal
     * Generate Natal (D1) chart
     */
    async getNatalChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;

            if (!birthData.birthDate || !birthData.birthTime || !birthData.latitude || !birthData.longitude) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: birthDate, birthTime, latitude, longitude'
                });
                return;
            }

            const cacheKey = { ...birthData, type: 'natal' };
            const cached = await cacheService.get<any>('natal', cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const chartData = await astroEngineClient.getNatalChart(birthData);
            await cacheService.set('natal', cacheKey, chartData);

            res.json({ success: true, data: chartData, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Natal chart generation failed');
            res.status(500).json({ success: false, error: error.message || 'Failed to generate natal chart' });
        }
    }

    /**
     * POST /internal/transit
     * Generate Transit chart
     */
    async getTransitChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'transit' };
            const cached = await cacheService.get<any>('transit', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getTransitChart(birthData);
            await cacheService.set('transit', cacheKey, data, 3600); // 1 hour cache for transit

            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Transit chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/divisional/:type
     * Generate Divisional chart (D2-D60)
     */
    async getDivisionalChart(req: Request, res: Response): Promise<void> {
        try {
            const { type } = req.params;
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type };
            const cached = await cacheService.get<any>(`divisional:${type}`, cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const chartData = await astroEngineClient.getDivisionalChart(birthData, type);
            await cacheService.set(`divisional:${type}`, cacheKey, chartData);

            res.json({ success: true, data: chartData, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message, type: req.params.type }, 'Divisional chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/moon-chart
     */
    async getMoonChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'moon' };
            const cached = await cacheService.get<any>('moon', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getMoonChart(birthData);
            await cacheService.set('moon', cacheKey, data);
            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Moon chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/sun-chart
     */
    async getSunChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'sun' };
            const cached = await cacheService.get<any>('sun', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getSunChart(birthData);
            await cacheService.set('sun', cacheKey, data);
            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Sun chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/sudarshan-chakra
     */
    async getSudarshanChakra(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'sudarshan' };
            const cached = await cacheService.get<any>('sudarshan', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getSudarshanChakra(birthData);
            await cacheService.set('sudarshan', cacheKey, data);
            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Sudarshan Chakra failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/ashtakavarga
     * Get Bhinna Ashtakavarga
     */
    async getAshtakavarga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'ashtakavarga' };
            const cached = await cacheService.get<any>('ashtakavarga', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getBhinnaAshtakavarga(birthData);
            await cacheService.set('ashtakavarga', cacheKey, data);
            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Ashtakavarga failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/sarva-ashtakavarga
     */
    async getSarvaAshtakavarga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'sarva' };
            const cached = await cacheService.get<any>('sarva-ashtakavarga', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getSarvaAshtakavarga(birthData);
            await cacheService.set('sarva-ashtakavarga', cacheKey, data);
            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Sarva Ashtakavarga failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/shodasha-varga
     */
    async getShodashaVarga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'shodasha' };
            const cached = await cacheService.get<any>('shodasha', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getShodashaVargaSummary(birthData);
            await cacheService.set('shodasha', cacheKey, data);
            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Shodasha Varga failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Helper method for validation
    private validateBirthData(data: BirthData, res: Response): boolean {
        if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return false;
        }
        return true;
    }
}

export const chartController = new ChartController();

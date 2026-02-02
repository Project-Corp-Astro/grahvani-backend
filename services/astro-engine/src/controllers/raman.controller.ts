import { Request, Response } from 'express';
import { ramanClient } from '../clients';
import { cacheService } from '../services/cache.service';
import { logger } from '../config/logger';
import { BirthData } from '../types';

// =============================================================================
// RAMAN AYANAMSA CONTROLLER
// Handles all Raman system calculations (35+ endpoints)
// =============================================================================

export class RamanController {
    // =========================================================================
    // NATAL & TRANSIT CHARTS
    // =========================================================================

    async getNatalChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-natal' };
            const cached = await cacheService.get<any>('raman-natal', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getNatalChart(birthData);
            await cacheService.set('raman-natal', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Natal chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getTransitChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-transit' };
            const cached = await cacheService.get<any>('raman-transit', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getTransitChart(birthData);
            await cacheService.set('raman-transit', cacheKey, data, 3600);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Transit chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getMoonChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-moon' };
            const cached = await cacheService.get<any>('raman-moon', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getMoonChart(birthData);
            await cacheService.set('raman-moon', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Moon chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getSunChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-sun' };
            const cached = await cacheService.get<any>('raman-sun', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getSunChart(birthData);
            await cacheService.set('raman-sun', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Sun chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getSudarshanChakra(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-sudarshan' };
            const cached = await cacheService.get<any>('raman-sudarshan', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getSudarshanChakra(birthData);
            await cacheService.set('raman-sudarshan', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Sudarshan Chakra failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // =========================================================================
    // DIVISIONAL CHARTS
    // =========================================================================

    async getDivisionalChart(req: Request, res: Response): Promise<void> {
        try {
            const { type } = req.params;
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: `raman-divisional:${type}` };
            const cached = await cacheService.get<any>(`raman-divisional:${type}`, cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', chartType: type, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getDivisionalChart(birthData, type);
            await cacheService.set(`raman-divisional:${type}`, cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', chartType: type, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message, type: req.params.type }, 'Raman Divisional chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // =========================================================================
    // LAGNA CHARTS
    // =========================================================================

    async getArudhaLagna(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'arudha-lagna', (data) => ramanClient.getArudhaLagna(data));
    }

    async getBhavaLagna(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'bhava-lagna', (data) => ramanClient.getBhavaLagna(data));
    }

    async getHoraLagna(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'hora-lagna', (data) => ramanClient.getHoraLagna(data));
    }

    async getSripathiBhava(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'sripathi-bhava', (data) => ramanClient.getSripathiBhava(data));
    }

    async getKpBhava(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'kp-bhava', (data) => ramanClient.getKpBhava(data));
    }

    async getEqualBhava(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'equal-bhava', (data) => ramanClient.getEqualBhava(data));
    }

    async getKarkamshaD1(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'karkamsha-d1', (data) => ramanClient.getKarkamshaD1(data));
    }

    async getKarkamshaD9(req: Request, res: Response): Promise<void> {
        await this.handleLagnaChart(req, res, 'karkamsha-d9', (data) => ramanClient.getKarkamshaD9(data));
    }

    private async handleLagnaChart(
        req: Request,
        res: Response,
        chartName: string,
        clientFn: (data: BirthData) => Promise<any>
    ): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: `raman-${chartName}` };
            const cached = await cacheService.get<any>(`raman-${chartName}`, cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await clientFn(birthData);
            await cacheService.set(`raman-${chartName}`, cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, `Raman ${chartName} failed`);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // =========================================================================
    // ASHTAKAVARGA
    // =========================================================================

    async getBhinnaAshtakavarga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-bhinna-ashtakavarga' };
            const cached = await cacheService.get<any>('raman-bhinna-ashtakavarga', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getBhinnaAshtakavarga(birthData);
            await cacheService.set('raman-bhinna-ashtakavarga', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Bhinna Ashtakavarga failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getSarvaAshtakavarga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-sarva-ashtakavarga' };
            const cached = await cacheService.get<any>('raman-sarva-ashtakavarga', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getSarvaAshtakavarga(birthData);
            await cacheService.set('raman-sarva-ashtakavarga', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Sarva Ashtakavarga failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getShodashaVarga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'raman-shodasha-varga' };
            const cached = await cacheService.get<any>('raman-shodasha-varga', cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await ramanClient.getShodashaVarga(birthData);
            await cacheService.set('raman-shodasha-varga', cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Raman Shodasha Varga failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // =========================================================================
    // DASHA
    // =========================================================================

    async getMahaAntarDasha(req: Request, res: Response): Promise<void> {
        await this.handleDasha(req, res, 'maha-antar', (data) => ramanClient.getMahaAntarDasha(data));
    }

    async getPratyantarDasha(req: Request, res: Response): Promise<void> {
        await this.handleDasha(req, res, 'pratyantar', (data) => ramanClient.getPratyantarDasha(data));
    }

    async getSookshmaDasha(req: Request, res: Response): Promise<void> {
        await this.handleDasha(req, res, 'sookshma', (data) => ramanClient.getSookshmaDasha(data));
    }

    async getPranaDasha(req: Request, res: Response): Promise<void> {
        await this.handleDasha(req, res, 'prana', (data) => ramanClient.getPranaDasha(data));
    }

    private async handleDasha(
        req: Request,
        res: Response,
        level: string,
        clientFn: (data: BirthData) => Promise<any>
    ): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: `raman-dasha:${level}` };
            const cached = await cacheService.get<any>(`raman-dasha:${level}`, cacheKey);
            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa: 'raman', level, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await clientFn(birthData);
            await cacheService.set(`raman-dasha:${level}`, cacheKey, data);
            res.json({ success: true, data, cached: false, ayanamsa: 'raman', level, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, `Raman ${level} dasha failed`);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private validateBirthData(data: BirthData, res: Response): boolean {
        if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
            res.status(400).json({ success: false, error: 'Missing required fields: birthDate, birthTime, latitude, longitude' });
            return false;
        }
        return true;
    }
}

export const ramanController = new RamanController();

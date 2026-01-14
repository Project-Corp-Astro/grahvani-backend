import { Request, Response } from 'express';
import { astroEngineClient, BirthData } from '../services/astro-client';
import { cacheService } from '../services/cache.service';
import { logger } from '../config/logger';

export class DashaController {
    /**
     * POST /internal/dasha/vimshottari
     * Get Vimshottari Dasha periods
     */
    async getVimshottariDasha(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            const level = req.query.level as string || 'mahadasha';

            if (!birthData.birthDate || !birthData.birthTime || !birthData.latitude || !birthData.longitude) {
                res.status(400).json({ success: false, error: 'Missing required fields' });
                return;
            }

            const cacheKey = { ...birthData, type: `dasha:${level}` };
            const cached = await cacheService.get<any>(`dasha:${level}`, cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, level, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getVimshottariDasha(birthData, level);
            await cacheService.set(`dasha:${level}`, cacheKey, data);

            res.json({ success: true, data, cached: false, level, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Dasha calculation failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /internal/dasha/prana
     * Get 5-level Dasha (up to Prana)
     */
    async getPranaDasha(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;

            if (!birthData.birthDate || !birthData.birthTime || !birthData.latitude || !birthData.longitude) {
                res.status(400).json({ success: false, error: 'Missing required fields' });
                return;
            }

            const cacheKey = { ...birthData, type: 'dasha:prana' };
            const cached = await cacheService.get<any>('dasha:prana', cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const data = await astroEngineClient.getVimshottariDasha(birthData, 'prana');
            await cacheService.set('dasha:prana', cacheKey, data);

            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Prana dasha calculation failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

export const dashaController = new DashaController();

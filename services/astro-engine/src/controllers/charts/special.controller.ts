import { Request, Response } from 'express';
import { lahiriClient, ramanClient, BirthData, AyanamsaType } from '../../clients';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../config/logger';

// =============================================================================
// SPECIAL CHARTS CONTROLLER
// Handles Transit, Moon, Sun, Sudarshan Chakra
// =============================================================================

export class SpecialChartsController {
    /**
     * POST /api/charts/transit
     */
    async getTransitChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            const ayanamsa: AyanamsaType = birthData.ayanamsa || 'lahiri';

            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'transit', ayanamsa };
            const cached = await cacheService.get<any>(`transit:${ayanamsa}`, cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const client = this.getClient(ayanamsa);
            const data = await client.getTransitChart(birthData);

            // Shorter cache for transit (1 hour)
            await cacheService.set(`transit:${ayanamsa}`, cacheKey, data, 3600);

            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Transit chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/charts/moon
     */
    async getMoonChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            const ayanamsa: AyanamsaType = birthData.ayanamsa || 'lahiri';

            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'moon', ayanamsa };
            const cached = await cacheService.get<any>(`moon:${ayanamsa}`, cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const client = this.getClient(ayanamsa);
            const data = await client.getMoonChart(birthData);
            await cacheService.set(`moon:${ayanamsa}`, cacheKey, data);

            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Moon chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/charts/sun
     */
    async getSunChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            const ayanamsa: AyanamsaType = birthData.ayanamsa || 'lahiri';

            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'sun', ayanamsa };
            const cached = await cacheService.get<any>(`sun:${ayanamsa}`, cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const client = this.getClient(ayanamsa);
            const data = await client.getSunChart(birthData);
            await cacheService.set(`sun:${ayanamsa}`, cacheKey, data);

            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Sun chart failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/charts/sudarshan-chakra
     */
    async getSudarshanChakra(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            const ayanamsa: AyanamsaType = birthData.ayanamsa || 'lahiri';

            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'sudarshan', ayanamsa };
            const cached = await cacheService.get<any>(`sudarshan:${ayanamsa}`, cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
                return;
            }

            const client = this.getClient(ayanamsa);
            const data = await client.getSudarshanChakra(birthData);
            await cacheService.set(`sudarshan:${ayanamsa}`, cacheKey, data);

            res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Sudarshan Chakra failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    private getClient(ayanamsa: AyanamsaType) {
        return ayanamsa === 'raman' ? ramanClient : lahiriClient;
    }

    private validateBirthData(data: BirthData, res: Response): boolean {
        if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return false;
        }
        return true;
    }
}

export const specialChartsController = new SpecialChartsController();

import { Request, Response } from 'express';
import { lahiriClient, ramanClient, yukteswarClient, BirthData, AyanamsaType } from '../../clients';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../config/logger';

// =============================================================================
// NATAL CHART CONTROLLER
// Handles natal chart generation across all ayanamsa systems
// =============================================================================

export class NatalController {
    /**
     * POST /api/charts/natal
     * Generate Natal (D1) chart
     */
    async getNatalChart(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            const ayanamsa: AyanamsaType = birthData.ayanamsa || 'lahiri';

            if (!this.validateBirthData(birthData, res)) return;

            // Cache key includes ayanamsa
            const cacheKey = { ...birthData, type: 'natal', ayanamsa };
            const cached = await cacheService.get<any>(`natal:${ayanamsa}`, cacheKey);

            if (cached) {
                res.json({ success: true, data: cached, cached: true, ayanamsa, calculatedAt: new Date().toISOString() });
                return;
            }

            // Route to appropriate client based on ayanamsa
            const client = this.getClient(ayanamsa);
            const chartData = await client.getNatalChart(birthData);

            await cacheService.set(`natal:${ayanamsa}`, cacheKey, chartData);

            res.json({ success: true, data: chartData, cached: false, ayanamsa, calculatedAt: new Date().toISOString() });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Natal chart generation failed');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    private getClient(ayanamsa: AyanamsaType) {
        switch (ayanamsa) {
            case 'raman': return ramanClient;
            case 'yukteswar': return yukteswarClient;
            case 'kp': return lahiriClient; // KP uses Lahiri for natal
            default: return lahiriClient;
        }
    }

    private validateBirthData(data: BirthData, res: Response): boolean {
        if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
            res.status(400).json({ success: false, error: 'Missing required fields: birthDate, birthTime, latitude, longitude' });
            return false;
        }
        return true;
    }
}

export const natalController = new NatalController();

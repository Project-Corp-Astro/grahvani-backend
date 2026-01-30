import { Request, Response } from 'express';
import { lahiriClient, BirthData } from '../../clients';
import { cacheService } from '../../services/cache.service';
import { logger } from '../../config/logger';

// =============================================================================
// PANCHANGA CONTROLLER
// Handles Panchanga, Muhurat, and Timing
// =============================================================================

export class PanchangaController {

    async getPanchanga(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'panchanga' };
            const cached = await cacheService.get('panchanga', cacheKey);
            if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

            const data = await lahiriClient.getPanchanga(birthData);
            await cacheService.set('panchanga', cacheKey, data);
            res.json({ success: true, data, cached: false });
        } catch (error: any) { this.handleError(res, error, 'Panchanga'); }
    }

    async getChoghadiya(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'choghadiya' };
            const cached = await cacheService.get('choghadiya', cacheKey);
            if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

            const data = await lahiriClient.getChoghadiya(birthData);
            await cacheService.set('choghadiya', cacheKey, data);
            res.json({ success: true, data, cached: false });
        } catch (error: any) { this.handleError(res, error, 'Choghadiya'); }
    }

    async getHora(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'hora-times' };
            const cached = await cacheService.get('hora-times', cacheKey);
            if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

            const data = await lahiriClient.getHoraTimes(birthData);
            await cacheService.set('hora-times', cacheKey, data);
            res.json({ success: true, data, cached: false });
        } catch (error: any) { this.handleError(res, error, 'Hora'); }
    }

    async getLagnaTimes(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'lagna-times' };
            const cached = await cacheService.get('lagna-times', cacheKey);
            if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

            const data = await lahiriClient.getLagnaTimes(birthData);
            await cacheService.set('lagna-times', cacheKey, data);
            res.json({ success: true, data, cached: false });
        } catch (error: any) { this.handleError(res, error, 'Lagna Times'); }
    }

    async getMuhurat(req: Request, res: Response): Promise<void> {
        try {
            const birthData: BirthData = req.body;
            if (!this.validateBirthData(birthData, res)) return;

            const cacheKey = { ...birthData, type: 'muhurat' };
            const cached = await cacheService.get('muhurat', cacheKey);
            if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

            const data = await lahiriClient.getMuhurat(birthData);
            await cacheService.set('muhurat', cacheKey, data);
            res.json({ success: true, data, cached: false });
        } catch (error: any) { this.handleError(res, error, 'Muhurat'); }
    }

    private validateBirthData(data: BirthData, res: Response): boolean {
        if (!data.birthDate || !data.latitude || !data.longitude) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return false;
        }
        return true;
    }

    private handleError(res: Response, error: any, context: string) {
        logger.error({ error: error.message }, `${context} failed`);
        res.status(500).json({ success: false, error: error.message });
    }
}

export const panchangaController = new PanchangaController();

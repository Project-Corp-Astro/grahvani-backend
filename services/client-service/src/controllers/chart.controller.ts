import { Response, NextFunction } from 'express';
import { chartService } from '../services/chart.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class ChartController {
    /**
     * POST /clients/:id/charts
     */
    async saveChart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const chart = await chartService.saveChart(tenantId, id, req.body, metadata);
            res.status(201).json(chart);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /clients/:id/charts
     */
    async getCharts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const charts = await chartService.getClientCharts(tenantId, id);
            res.json(charts);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /clients/:id/charts/:chartId
     */
    async deleteChart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { chartId } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            await chartService.deleteChart(tenantId, chartId, metadata);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/charts/generate
     * Generate chart from Astro Engine and save it
     */
    async generateChart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const { chartType, system, ayanamsa } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            // Use ayanamsa if provided, fallback to system, default to lahiri
            const selectedSystem = ayanamsa || system || 'lahiri';

            const chart = await chartService.generateAndSaveChart(
                tenantId,
                id,
                chartType || 'D1',
                selectedSystem,
                metadata
            );

            res.status(201).json(chart);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/dasha
     * Generate dasha periods for a client (Ayanamsa-aware)
     */
    async generateDasha(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const { level, ayanamsa } = req.body;

            const dasha = await chartService.generateDasha(
                tenantId,
                id,
                level || 'mahadasha',
                ayanamsa || 'lahiri'
            );

            res.json(dasha);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/charts/generate-core
     * Bulk generate core charts (D1, D9) for all systems
     */
    async generateCoreCharts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            const charts = await chartService.generateCoreCharts(tenantId, id, metadata);
            res.status(201).json({ success: true, count: charts.length });
        } catch (error) {
            next(error);
        }
    }
}

export const chartController = new ChartController();


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
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const charts = await chartService.getClientCharts(tenantId, id, metadata);
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
     * Optional: save=true to persist to database
     */
    async generateDasha(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const { level, ayanamsa, save, mahaLord, antarLord, pratyantarLord, sookshmaLord } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            const options = { mahaLord, antarLord, pratyantarLord, sookshmaLord };

            let dasha;
            if (level === 'deep') {
                dasha = await chartService.generateDeepDasha(
                    tenantId,
                    id,
                    ayanamsa || 'lahiri',
                    metadata
                );
            } else if (save) {
                dasha = await chartService.generateAndSaveDasha(
                    tenantId,
                    id,
                    level || 'mahadasha',
                    ayanamsa || 'lahiri',
                    options,
                    metadata
                );
            } else {
                dasha = await chartService.generateDasha(
                    tenantId,
                    id,
                    level || 'mahadasha',
                    ayanamsa || 'lahiri',
                    options
                );
            }

            res.json(dasha);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/dasha/:system
     * Generate alternative Dasha systems (tribhagi, shodashottari, dwadashottari, etc)
     * System param: tribhagi, shodashottari, dwadashottari, panchottari, shattrimshatsama, chaturshitisama, shastihayani, satabdika, dwisaptati
     */
    async generateAlternativeDasha(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id, system } = req.params;
            const tenantId = req.user!.tenantId;
            const { ayanamsa, save, level } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            // Map system names directly (astro-engine expects: tribhagi, shodashottari, dwadashottari, etc.)
            const dashaSystemMap: Record<string, string> = {
                tribhagi: 'tribhagi',
                tribhagi40: 'tribhagi',
                shodashottari: 'shodashottari',
                dwadashottari: 'dwadashottari',
                panchottari: 'panchottari',
                shattrimshatsama: 'shattrimshatsama',
                chaturshitisama: 'chaturshitisama',
                shastihayani: 'shastihayani',
                satabdika: 'satabdika',
                dwisaptati: 'dwisaptati',
                other: 'tribhagi', // Default for 'other'
            };

            const dashaType = dashaSystemMap[system.toLowerCase()] || dashaSystemMap['tribhagi'];

            const dasha = await chartService.generateAlternativeDasha(
                tenantId,
                id,
                dashaType,
                ayanamsa || 'lahiri',
                level || 'mahadasha',
                save || false,
                metadata
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

    /**
     * POST /clients/:id/charts/generate-full
     * Exhaustive generation of all possible diagrams and tables
     */
    async generateFullVedicProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            const result = await chartService.generateFullVedicProfile(tenantId, id, metadata);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /charts/generate-all
     * Generate core charts for all clients in the tenant
     */
    async generateAllClientsCharts(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            await chartService.generateBulkCharts(tenantId, metadata);
            res.status(200).json({ success: true, message: 'Bulk generation started' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/ashtakavarga
     * Generate Ashtakavarga (Lahiri/Raman only)
     */
    async generateAshtakavarga(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const { ayanamsa, type, save } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            let result;
            if (save || true) { // Defaulting to save as per user requirements for persistence
                result = await chartService.generateAndSaveAshtakavarga(
                    tenantId,
                    id,
                    type || 'bhinna',
                    ayanamsa || 'lahiri',
                    metadata
                );
            } else {
                result = await chartService.generateAshtakavarga(
                    tenantId,
                    id,
                    type || 'bhinna',
                    ayanamsa || 'lahiri'
                );
            }

            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/sudarshan-chakra
     */
    async generateSudarshanChakra(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const { ayanamsa, save } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            let chakra;
            if (save || true) { // Defaulting to save
                chakra = await chartService.generateAndSaveSudarshanChakra(
                    tenantId,
                    id,
                    ayanamsa || 'lahiri',
                    metadata
                );
            } else {
                chakra = await chartService.generateSudarshanChakra(
                    tenantId,
                    id,
                    ayanamsa || 'lahiri'
                );
            }

            res.json(chakra);
        } catch (error) {
            next(error);
        }
    }
}

export const chartController = new ChartController();



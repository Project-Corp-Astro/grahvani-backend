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

            // Trigger background audit for missing charts
            // REMOVED for performance audit (Phase 1 Fix): Heavy write logic on read path
            // chartService.ensureFullVedicProfile(tenantId, id, metadata);

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
            const { ayanamsa, save, level, mahaLord, antarLord, pratyantarLord } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };

            // Map system names directly (astro-engine expects: tribhagi, shodashottari, dwadashottari, etc.)
            const dashaSystemMap: Record<string, string> = {
                tribhagi: 'tribhagi',
                'tribhagi-40': 'tribhagi-40', // Explicit mapping
                tribhagi40: 'tribhagi-40', // Handle potential alias
                ashtottari: 'ashtottari',
                'ashtottari_antar': 'ashtottari_antar',
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

            let dashaType = dashaSystemMap[system.toLowerCase()] || dashaSystemMap['tribhagi'];

            // Logic to handle Ashtottari 3rd level which has a distinct endpoint
            if ((dashaType === 'ashtottari' || dashaType === 'ashtottari_antar') && level === 'pratyantardasha') {
                dashaType = 'ashtottari_pratyantardasha';
            }

            const options = { mahaLord, antarLord, pratyantarLord };

            const dasha = await chartService.generateAlternativeDasha(
                tenantId,
                id,
                dashaType,
                ayanamsa || 'lahiri',
                level || 'mahadasha',
                options,
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

    // =========================================================================
    // RAMAN SYSTEM SPECIFIC ENDPOINTS
    // =========================================================================

    /**
     * POST /clients/:id/raman/natal
     */
    async generateRamanNatal(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = { userId: req.user!.id, ipAddress: req.ip, userAgent: req.get('user-agent') };
            const chart = await chartService.generateAndSaveChart(tenantId, id, 'D1', 'raman', metadata);

            // Wrap in standard RamanApiResponse structure expected by frontend
            res.status(201).json({
                success: true,
                data: chart.chartData,
                cached: chart.cached,
                calculatedAt: chart.calculatedAt,
                ayanamsa: 'raman'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/raman/transit
     */
    async generateRamanTransit(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = { userId: req.user!.id, ipAddress: req.ip, userAgent: req.get('user-agent') };
            const chart = await chartService.generateAndSaveChart(tenantId, id, 'transit', 'raman', metadata);

            res.status(201).json({
                success: true,
                data: chart.chartData,
                cached: chart.cached,
                calculatedAt: chart.calculatedAt,
                ayanamsa: 'raman'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/raman/divisional/:type
     */
    async generateRamanDivisional(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id, type } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = { userId: req.user!.id, ipAddress: req.ip, userAgent: req.get('user-agent') };
            const chart = await chartService.generateAndSaveChart(tenantId, id, type, 'raman', metadata);

            res.status(201).json({
                success: true,
                data: chart.chartData,
                cached: chart.cached,
                calculatedAt: chart.calculatedAt,
                ayanamsa: 'raman'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/raman/dasha/:level
     */
    async generateRamanDasha(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id, level } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = { userId: req.user!.id, ipAddress: req.ip, userAgent: req.get('user-agent') };
            const dasha = await chartService.generateAndSaveDasha(tenantId, id, level, 'raman', {}, metadata);

            res.json({
                success: true,
                data: dasha.chartData,
                cached: dasha.cached,
                calculatedAt: dasha.calculatedAt,
                ayanamsa: 'raman'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/raman/:type
     * Generic handler for special Raman charts (arudha-lagna, etc)
     */
    async generateRamanChart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id, type } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = { userId: req.user!.id, ipAddress: req.ip, userAgent: req.get('user-agent') };
            const chart = await chartService.generateAndSaveChart(tenantId, id, type, 'raman', metadata);

            res.status(201).json({
                success: true,
                data: chart.chartData,
                cached: chart.cached,
                calculatedAt: chart.calculatedAt,
                ayanamsa: 'raman'
            });
        } catch (error) {
            next(error);
        }
    }

    // =========================================================================
    // KP (KRISHNAMURTI PADDHATI) SYSTEM ENDPOINTS
    // These proxy to astro-engine's KP routes
    // =========================================================================

    /**
     * POST /clients/:id/kp/planets-cusps
     * Get KP planets and cusps with sub-lords
     */
    async getKpPlanetsCusps(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const result = await chartService.getKpPlanetsCusps(tenantId, id, metadata);
            res.json({
                success: true,
                data: result.chartData,
                cached: result.cached,
                calculatedAt: result.calculatedAt
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/kp/ruling-planets
     * Get current ruling planets for timing analysis
     */
    async getKpRulingPlanets(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const result = await chartService.getKpRulingPlanets(tenantId, id, metadata);
            res.json({
                success: true,
                data: result.chartData,
                cached: result.cached,
                calculatedAt: result.calculatedAt
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/kp/bhava-details
     * Get KP Bhava (House) details
     */
    async getKpBhavaDetails(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const result = await chartService.getKpBhavaDetails(tenantId, id, metadata);
            res.json({
                success: true,
                data: result.chartData,
                cached: result.cached,
                calculatedAt: result.calculatedAt
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/kp/significations
     * Get KP significations
     */
    async getKpSignifications(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const result = await chartService.getKpSignifications(tenantId, id, metadata);
            res.json({
                success: true,
                data: result.chartData,
                cached: result.cached,
                calculatedAt: result.calculatedAt
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/kp/house-significations
     * Get KP House Significations (Table 1)
     */
    async getKpHouseSignifications(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const result = await chartService.getKpHouseSignifications(tenantId, id, metadata);
            res.json({
                success: true,
                data: result.chartData,
                cached: result.cached,
                calculatedAt: result.calculatedAt
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/kp/planets-significators
     * Get KP Planet Significators (Table 2 - Matrix)
     */
    async getKpPlanetSignificators(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            const result = await chartService.getKpPlanetSignificators(tenantId, id, metadata);
            res.json({
                success: true,
                data: result.chartData,
                cached: result.cached,
                calculatedAt: result.calculatedAt
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /clients/:id/kp/horary
     * Get KP Horary (Prashna) analysis
     */
    async getKpHorary(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.user!.tenantId;
            const { horaryNumber, question } = req.body;
            const metadata = {
                userId: req.user!.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            };
            // Horary returns a custom object { success, data, calculatedAt } from service
            // Just pass it through as it's already formatted in service or needs minor adjustment?
            // Checking chart.service.ts getKpHorary:
            // returns { success: true, data: result, calculatedAt: ..., system: 'kp' }
            // So this one is actually already formatted correctly!
            const result = await chartService.getKpHorary(tenantId, id, horaryNumber, question, metadata);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export const chartController = new ChartController();



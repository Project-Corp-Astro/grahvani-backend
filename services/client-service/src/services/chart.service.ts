import { chartRepository } from '../repositories/chart.repository';
import { clientRepository } from '../repositories/client.repository';
import { ClientNotFoundError, FeatureNotSupportedError } from '../errors/client.errors';
import { eventPublisher } from './event.publisher';
import { activityService } from './activity.service';
import { RequestMetadata } from './client.service';
import { astroEngineClient } from '../clients/astro-engine.client';
import { calculateSubPeriods } from '../utils/vimshottari-calc';
import { logger, isChartAvailable, getAvailableCharts, AyanamsaSystem, SYSTEM_CAPABILITIES, markEndpointFailed, shouldSkipEndpoint, clearEndpointFailure } from '../config';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Max concurrent DB operations for Supabase free tier (10 connections max)
const MAX_CONCURRENT_OPS = 1; // Strict limit to avoid "MaxClientsInSessionMode"

// Track background generation tasks to avoid overlaps
export const generationLocks = new Set<string>();

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute promises in batches to avoid connection pool exhaustion
 * Optimized for Supabase free tier (limited connections)
 */
async function executeBatched<T>(tasks: (() => Promise<T>)[], batchSize = MAX_CONCURRENT_OPS, delayMs = 200): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        // Execute batch sequentially to be extra safe with connections
        for (const task of batch) {
            results.push(await task());
            await sleep(delayMs);
        }
    }
    return results;
}

function validateUuid(id: string | undefined | null): string | undefined {
    if (!id) return undefined;
    return UUID_REGEX.test(id) ? id : undefined;
}

export class ChartService {
    /**
     * Save a chart for a client
     */
    async saveChart(tenantId: string, clientId: string, data: any, metadata: RequestMetadata) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const validUserId = validateUuid(metadata.userId);

        const chart = await chartRepository.create(tenantId, {
            ...data,
            clientId,
            createdBy: validUserId
        });

        // Record activity
        await activityService.recordActivity({
            tenantId,
            clientId,
            userId: validUserId,
            action: 'client.chart_saved',
            details: { chartId: chart.id, type: chart.chartType, name: chart.chartName },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // Publish event
        await eventPublisher.publish('client.chart_saved', {
            clientId,
            tenantId,
            data: { chartId: chart.id, type: chart.chartType, name: chart.chartName },
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        logger.info({ tenantId, clientId, chartId: chart.id }, 'Astrological chart saved');

        return chart;
    }

    /**
     * Get saved charts for client
     */
    async getClientCharts(tenantId: string, clientId: string, metadata?: RequestMetadata) {
        // Pre-emptive technical audit
        // Fetch charts once
        const charts = await chartRepository.findByClientId(tenantId, clientId);

        // Exclude massive deep dasha trees from bulk responses to avoid 19MB payloads
        // These can be fetched specifically via generateDasha/generateDeepDasha if needed
        const filteredCharts = charts.filter(c => {
            if (c.chartType === ('dasha' as any)) {
                const config = c.chartConfig as any;
                if (config?.level === 'mahadasha_to_prana' || config?.level === 'exhaustive_vimshottari') {
                    return false;
                }
            }
            return true;
        });

        return filteredCharts;
    }

    /**
     * Delete saved chart
     */
    async deleteChart(tenantId: string, id: string, metadata: RequestMetadata) {
        const chart = await chartRepository.findById(tenantId, id);

        await chartRepository.delete(tenantId, id);

        const validUserId = validateUuid(metadata.userId);

        // Record activity
        await activityService.recordActivity({
            tenantId,
            clientId: chart?.clientId,
            userId: validUserId,
            action: 'client.chart_deleted',
            details: { chartId: id },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // Publish event
        await eventPublisher.publish('client.chart_deleted', {
            clientId: chart?.clientId || '',
            tenantId,
            data: { chartId: id },
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        logger.info({ tenantId, chartId: id }, 'Saved chart deleted');
        return { success: true };
    }

    /**
     * Generate chart from Astro Engine and save it
     */
    async generateAndSaveChart(
        tenantId: string,
        clientId: string,
        chartType: string,
        system: 'lahiri' | 'kp' | 'raman' | 'yukteswar' | 'western',
        metadata: RequestMetadata
    ) {
        // Validate chart type is available for this system
        if (!isChartAvailable(system as AyanamsaSystem, chartType)) {
            logger.warn({ system, chartType, clientId }, 'Requested chart type not available for selected system');
            throw new FeatureNotSupportedError(chartType, system);
        }

        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const birthData = this.prepareBirthData(client, system);

        // Call astro-engine service with Ayanamsa-aware routing
        let chartData;
        let dbChartType = chartType.toUpperCase() as any;
        const normalizedType = chartType.toLowerCase();

        if (normalizedType === 'd1' || normalizedType === 'natal') {
            chartData = await astroEngineClient.getNatalChart(birthData, system);
            dbChartType = 'D1';
        } else if (normalizedType === 'sun' || normalizedType === 'sun_chart') {
            chartData = await astroEngineClient.getSunChart(birthData, system);
            dbChartType = 'sun_chart';
        } else if (normalizedType === 'moon' || normalizedType === 'moon_chart') {
            chartData = await astroEngineClient.getMoonChart(birthData, system);
            dbChartType = 'moon_chart';
        } else if (normalizedType === 'arudha' || normalizedType === 'arudha_lagna') {
            chartData = await astroEngineClient.getArudhaLagna(birthData, system);
            dbChartType = 'arudha_lagna';
        } else if (normalizedType === 'bhava' || normalizedType === 'bhava_lagna') {
            chartData = await astroEngineClient.getBhavaLagna(birthData, system);
            dbChartType = 'bhava_lagna';
        } else if (normalizedType === 'hora' || normalizedType === 'hora_lagna') {
            chartData = await astroEngineClient.getHoraLagna(birthData, system);
            dbChartType = 'hora_lagna';
        } else if (normalizedType === 'sripathi' || normalizedType === 'sripathi_bhava') {
            chartData = await astroEngineClient.getSripathiBhava(birthData, system);
            dbChartType = 'sripathi_bhava';
        } else if (normalizedType === 'kp_bhava') {
            chartData = await astroEngineClient.getKpBhava(birthData, system);
            dbChartType = 'kp_bhava';
        } else if (normalizedType === 'equal_bhava') {
            chartData = await astroEngineClient.getEqualBhava(birthData, system);
            dbChartType = 'equal_bhava';
        } else if (normalizedType === 'equal_chart') {
            chartData = await astroEngineClient.getEqualChart(birthData, system);
            dbChartType = 'equal_chart';
        } else if (normalizedType === 'karkamsha') {
            // Contextual fallback: if just 'karkamsha' requested, default to D1
            chartData = await astroEngineClient.getKarkamshaD1(birthData, system);
            dbChartType = 'karkamsha';
        } else if (normalizedType === 'karkamsha_d1') {
            chartData = await astroEngineClient.getKarkamshaD1(birthData, system);
            dbChartType = 'karkamsha_d1';
        } else if (normalizedType === 'karkamsha_d9') {
            chartData = await astroEngineClient.getKarkamshaD9(birthData, system);
            dbChartType = 'karkamsha_d9';
        } else if (normalizedType === 'transit') {
            // For Transit (Gochar), we must use the current date/time to see live positions
            // while maintaining the natal geolocation for house calculations
            const now = new Date();
            const transitData = {
                ...birthData,
                birthDate: now.toISOString().split('T')[0],
                birthTime: now.toTimeString().split(' ')[0], // HH:MM:SS
            };
            chartData = await astroEngineClient.getTransitChart(transitData, system);
            dbChartType = 'transit';
        } else if (normalizedType === 'sudarshan' || normalizedType === 'sudarshana') {
            chartData = await astroEngineClient.getSudarshanChakra(birthData, system);
            dbChartType = 'sudarshana';
        } else if (normalizedType === 'numerology_chaldean') {
            chartData = await astroEngineClient.getChaldeanNumerology({ ...birthData, name: client.fullName });
            dbChartType = 'numerology_chaldean';
        } else if (normalizedType === 'numerology_loshu') {
            chartData = await astroEngineClient.getLoShuGrid(birthData);
            dbChartType = 'numerology_loshu';
        } else if (normalizedType.startsWith('yoga_') || normalizedType.startsWith('yoga:')) {
            const yogaType = normalizedType.replace('yoga_', '').replace('yoga:', '');
            chartData = await astroEngineClient.getYogaAnalysis(birthData, yogaType, system);
            dbChartType = `yoga_${yogaType}` as any;
        } else if (normalizedType.startsWith('dosha_') || normalizedType.startsWith('dosha:')) {
            const doshaType = normalizedType.replace('dosha_', '').replace('dosha:', '');
            chartData = await astroEngineClient.getDoshaAnalysis(birthData, doshaType, system);
            dbChartType = `dosha_${doshaType}` as any;
        } else if (normalizedType.startsWith('remedy_') || normalizedType.startsWith('remedy:')) {
            const remedyType = normalizedType.replace('remedy_', '').replace('remedy:', '');
            chartData = await astroEngineClient.getRemedy(birthData, remedyType, system);
            dbChartType = `remedy_${remedyType}` as any;
        } else if (normalizedType === 'panchanga' || normalizedType.startsWith('panchanga:')) {
            const panchType = normalizedType.includes(':') ? normalizedType.split(':')[1] : normalizedType;
            chartData = await astroEngineClient.getPanchanga(birthData, panchType, system);
            dbChartType = panchType === 'panchanga' ? 'panchanga' : (panchType as any);
        } else if (normalizedType === 'choghadiya' || normalizedType === 'hora_times' || normalizedType === 'lagna_times' || normalizedType === 'muhurat') {
            chartData = await astroEngineClient.getPanchanga(birthData, normalizedType, system);
            dbChartType = normalizedType as any;
        } else if (normalizedType === 'shadbala') {
            chartData = await astroEngineClient.getShadbala(birthData, system);
            dbChartType = 'shadbala';
        } else if (normalizedType === 'kp_planets_cusps') {
            // KP-specific: Planets and Cusps with sub-lords
            chartData = await astroEngineClient.getKpPlanetsCusps(birthData);
            dbChartType = 'kp_planets_cusps';
        } else if (normalizedType === 'kp_ruling_planets') {
            // KP-specific: Ruling Planets
            chartData = await astroEngineClient.getRulingPlanets(birthData);
            dbChartType = 'kp_ruling_planets';
        } else if (normalizedType === 'kp_bhava_details') {
            // KP-specific: Bhava (House) Details
            chartData = await astroEngineClient.getBhavaDetails(birthData);
            dbChartType = 'kp_bhava_details';
        } else if (normalizedType === 'kp_significations') {
            // KP-specific: Significations
            chartData = await astroEngineClient.getSignifications(birthData);
            dbChartType = 'kp_significations';
        } else if (normalizedType === 'kp_house_significations') {
            // KP-specific: House Significations (Table 1)
            chartData = await astroEngineClient.getKpHouseSignifications(birthData);
            dbChartType = 'kp_house_significations';
        } else if (normalizedType === 'kp_planet_significators') {
            // KP-specific: Planet Significators (Table 2 - Matrix)
            chartData = await astroEngineClient.getKpPlanetSignificators(birthData);
            dbChartType = 'kp_planet_significators';
        } else {
            // Default to divisional chart generation
            chartData = await astroEngineClient.getDivisionalChart(birthData, chartType, system);
        }

        // Save chart to database
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: dbChartType as any,
            chartName: `${client.fullName} - ${chartType.toUpperCase()} Chart (${system})`,
            chartData: chartData.data,
            chartConfig: { system }, // Store system for filtering
            calculatedAt: new Date(),
            system, // Explicitly pass for upsert unique constraint
        }, metadata);

        logger.info({ tenantId, clientId, chartType }, 'Chart generated and saved');

        return {
            ...chart,
            cached: chartData.cached,
        };
    }

    /**
     * Bulk generate core charts (D1, D9) for all 3 systems
     */

    /**
     * Bulk generate core charts (D1, D9) for all included systems
     */
    async generateCoreCharts(tenantId: string, clientId: string, metadata: RequestMetadata) {
        const systems: AyanamsaSystem[] = ['lahiri', 'raman', 'kp'];
        const operations: (() => Promise<any>)[] = [];

        for (const sys of systems) {
            const vargas = sys === 'kp' ? ['D1'] : ['D1', 'D9'];
            for (const varga of vargas) {
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, varga, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, varga }, 'Bulk generation failed for specific chart'))
                );
            }
        }
        return executeBatched(operations);
    }

    /**
     * Generate full profiles for all clients in a tenant
     */
    async generateBulkCharts(tenantId: string, metadata: RequestMetadata) {
        const clients = await clientRepository.findMany(tenantId, { take: 1000 });
        const operations = clients
            .filter(client => client.birthDate && client.birthTime)
            .map(client => () =>
                this.generateFullVedicProfile(tenantId, client.id, metadata)
                    .catch(err => logger.error({ err, clientId: client.id }, 'Bulk complete profile failed for client'))
            );

        return executeBatched(operations, 1);
    }



    /**
     * Technical Audit: Ensures all charts required by a system are present.
     * PERFORMANCE: Skips audit if generationStatus is 'completed' and versions match.
     */
    async ensureFullVedicProfile(tenantId: string, clientId: string, metadata: RequestMetadata): Promise<void> {
        // Use a lock to prevent concurrent audits/generations for the same client
        if (generationLocks.has(clientId)) {
            logger.warn({ clientId }, '⚠️ AUDIT: Already locked, skipping');
            return;
        }

        try {
            // 1. Fetch client with status and version
            const client = await clientRepository.findById(tenantId, clientId);
            if (!client) return;

            const currentStatus = (client as any).generationStatus;
            logger.info({ clientId, currentStatus }, '🔍 AUDIT: Checking for missing charts');

            // 2. ALWAYS check for missing charts, even if marked as 'completed'
            // This ensures Ashtakavarga and other previously failed charts get retried
            if (currentStatus !== 'processing') {
                logger.info({ clientId }, '🚀 AUDIT: Triggering background generation');
                this.generateFullVedicProfile(tenantId, clientId, metadata).catch(err => {
                    logger.error({ err, clientId }, 'Background generation failed');
                });
            } else {
                logger.warn({ clientId }, '⏸️ AUDIT: Already processing, skipping');
            }
        } catch (error) {
            logger.error({ error, clientId }, 'Error during profile audit');
        }
    }

    async generateFullVedicProfile(tenantId: string, clientId: string, metadata: RequestMetadata): Promise<any> {
        if (generationLocks.has(clientId)) {
            logger.warn({ clientId }, '⚠️ GENERATION: Already locked, exiting');
            return { status: 'already_processing' };
        }

        generationLocks.add(clientId);
        const startTime = Date.now();
        logger.info({ clientId }, '🔒 GENERATION: Lock acquired, starting full profile generation');

        try {
            const client = await clientRepository.findById(tenantId, clientId);
            if (!client) throw new Error('Client not found');

            // 1. Mark as Processing
            await clientRepository.update(tenantId, clientId, { generationStatus: 'processing' } as any);

            const ayanamsas: AyanamsaSystem[] = ['lahiri', 'kp', 'raman', 'yukteswar'];
            const results: any = {};

            // 2. Loop through systems and check missing
            for (const system of ayanamsas) {
                const missing = await this.getMissingCharts(tenantId, clientId, system);
                logger.info({ system, missingCount: missing.length, missing: missing.slice(0, 5), clientId }, `📊 MISSING CHARTS [${system.toUpperCase()}]`);
                if (missing.length > 0) {
                    logger.info({ system, missingCount: missing.length, clientId }, '🔧 GENERATING missing charts for system');
                    await this.generateMissingCharts(tenantId, clientId, missing, system, metadata);

                    // Specific specialized generations for each system
                    if (system === 'lahiri' || system === 'raman') {
                        await this.generateAllApplicableDashas(tenantId, clientId, system, metadata);
                    } else if (system === 'kp') {
                        await this.generateAllApplicableDashas(tenantId, clientId, 'kp', metadata);
                    }
                }
                results[system] = { missingCount: missing.length };
            }

            // 3. Mark as Completed
            await clientRepository.update(tenantId, clientId, {
                generationStatus: 'completed',
                chartsVersion: 2 // Updated system version
            } as any);

            const duration = Date.now() - startTime;
            logger.info({ clientId, duration }, 'Full Vedic Profile generation completed successfully');

            return {
                status: 'success',
                duration,
                results
            };
        } catch (error: any) {
            logger.error({ error: error.message, clientId }, 'Full Vedic Profile generation failed');
            await clientRepository.update(tenantId, clientId, { generationStatus: 'failed' } as any);
            throw error;
        } finally {
            generationLocks.delete(clientId);
        }
    }

    /**
     * Generate only specific missing charts (more efficient than full regeneration)
     * Uses endpoint failure tracking to skip known-failing endpoints
     */
    private async generateMissingCharts(
        tenantId: string,
        clientId: string,
        missingCharts: string[],
        system: AyanamsaSystem,
        metadata: RequestMetadata
    ) {
        const operations: (() => Promise<any>)[] = [];

        for (const chartType of missingCharts) {
            const lowerType = chartType.toLowerCase();

            // Skip endpoints that have recently failed
            if (shouldSkipEndpoint(system, chartType)) {
                logger.debug({ system, chartType }, 'Skipping previously failed endpoint');
                continue;
            }

            // DOUBLE CHECK: Validate chart is still applicable (in case of cached old missing list)
            if (!isChartAvailable(system, chartType)) {
                logger.debug({ system, chartType }, 'Skipping inapplicable chart for system');
                continue;
            }

            if (lowerType.startsWith('ashtakavarga_')) {
                const type = lowerType.replace('ashtakavarga_', '') as 'sarva' | 'bhinna' | 'shodasha';
                operations.push(() =>
                    this.generateAndSaveAshtakavarga(tenantId, clientId, type, system, metadata)
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Chart generation failed - endpoint marked');
                        })
                );
            } else if (lowerType === 'sudarshana' || lowerType === 'sudarshan') {
                operations.push(() =>
                    this.generateAndSaveSudarshanChakra(tenantId, clientId, system, metadata)
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Chart generation failed - endpoint marked');
                        })
                );
            } else if (lowerType === 'dasha' && system !== 'kp') {
                // 'dasha' is specifically for Raw Prana Vimshottari (Lahiri/Raman)
                operations.push(() =>
                    this.generateDeepDasha(tenantId, clientId, system, metadata)
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Background deep dasha generation failed');
                        })
                );
            } else if (lowerType === 'dasha_vimshottari') {
                // 'dasha_vimshottari' is for UI-optimized Tree
                operations.push(() =>
                    this.generateDasha(tenantId, clientId, 'tree', system, {})
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Background tree dasha generation failed');
                        })
                );
            } else if (lowerType.startsWith('dasha_')) {
                // Correctly route dasha_tribhagi etc to generateAlternativeDasha
                const dashaName = lowerType.replace('dasha_', '');
                operations.push(() =>
                    this.generateAlternativeDasha(tenantId, clientId, dashaName, system, 'mahadasha', true, metadata)
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Background alternative dasha generation failed');
                        })
                );
            } else if (lowerType === 'dasha_summary') {
                // Correctly route dasha_summary to internal logic
                operations.push(() =>
                    this.generateDashaSummary(tenantId, clientId, system, metadata)
                        .catch(err => {
                            logger.warn({ clientId, system, err: err.message }, 'Background dasha summary failed');
                        })
                );
            } else if (lowerType.startsWith('kp_')) {
                // Specialized KP methods
                const methodMap: Record<string, string> = {
                    'kp_planets_cusps': 'getKpPlanetsCusps',
                    'kp_ruling_planets': 'getKpRulingPlanets',
                    'kp_bhava_details': 'getKpBhavaDetails',
                    'kp_significations': 'getKpSignifications'
                };
                const methodName = methodMap[lowerType];
                if (methodName && (this as any)[methodName]) {
                    // CRITICAL FIX: Do NOT swallow errors silently. Log them.
                    operations.push(() => (this as any)[methodName](tenantId, clientId, metadata)
                        .catch((err: any) => {
                            logger.warn({ err: err.message, clientId, chartType }, 'KP chart generation failed');
                            if (err?.statusCode === 404 || err?.statusCode === 500) markEndpointFailed(system, chartType);
                        }));
                }
            } else {
                // Default CATCH-ALL for:
                // 1. Divisional Charts (D1...D60)
                // 2. Special Charts (moon, sun, etc)
                // 3. Yogas (yoga_*)
                // 4. Doshas (dosha_*)
                // 5. Remedies (remedy_*)
                // 6. Panchanga (panchanga, hora, etc)
                // The generateAndSaveChart method handles routing based on prefix/type.
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, chartType, system, metadata)
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Chart generation failed - endpoint marked');
                        })
                );
            }
        }

        if (operations.length === 0) {
            logger.debug({ clientId, system }, 'No chart operations to run (all endpoints skipped or no missing charts)');
            return [];
        }

        return executeBatched(operations, 2);
    }

    /**
     * Generate dasha periods for a client (Ayanamsa-aware)
     */
    async generateDasha(
        tenantId: string,
        clientId: string,
        level: string = 'mahadasha',
        ayanamsa: AyanamsaSystem = 'lahiri',
        options: any = {}
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const drillDownPath = options.drillDownPath || [];
        const birthData = this.prepareBirthData(client, ayanamsa);

        // DB-FIRST: Check if this EXACT dasha already exists in database (High Performance)
        const matchingDasha = await chartRepository.findOneByTypeAndSystem(
            tenantId,
            clientId,
            'dasha_vimshottari',
            ayanamsa
        );

        if (matchingDasha && (matchingDasha.chartConfig as any)?.level === level) {
            logger.info({ clientId, level, ayanamsa }, 'Dasha found in database - checking for data completeness');

            let dashaData: any = matchingDasha.chartData;
            const rootList = dashaData.dasha_list || dashaData.mahadashas || [];

            // If it's a 'tree' request, ensure it's at least 3 levels deep, and always get a 5-level active path summary
            if (level === 'tree' && rootList.length > 0) {
                const wasExpanded = this.populateSublevelsRecursive(rootList, 1, 3, drillDownPath);
                const currentPath = this.extractCurrentPathRecursive(rootList); // Fully 5-level path

                if (wasExpanded || !dashaData.curr_path) {
                    logger.info({ clientId }, 'Updating database record with balanced tree and current path summary');
                    const updatedData = { ...dashaData, mahadashas: rootList, curr_path: currentPath };
                    await chartRepository.update(tenantId, matchingDasha.id, {
                        chartData: updatedData,
                        calculatedAt: new Date()
                    });
                    dashaData = updatedData;
                } else {
                    // Just update a local copy for response
                    dashaData = { ...dashaData, curr_path: currentPath };
                }
            }

            return {
                clientId,
                clientName: client.fullName,
                level,
                ayanamsa,
                data: dashaData,
                cached: true,
                calculatedAt: matchingDasha.calculatedAt,
            };
        }

        const dashaData = await astroEngineClient.getVimshottariDasha(birthData, level, options);

        // Helper to extract the list based on context
        const rootList = (dashaData as any).dasha_list || (dashaData as any).data?.mahadashas || (dashaData as any).data?.dasha_list || [];

        let finalList = rootList;
        let lastParent: any = null;

        // Determine hierarchy path from options
        const contextLords = [options.mahaLord, options.antarLord, options.pratyantarLord, options.sookshmaLord].filter(Boolean);
        let processedIndex = 0; // Track how deep we got in the engine data

        if (rootList.length > 0 && contextLords.length > 0) {
            let currentNodes = rootList;
            for (let i = 0; i < contextLords.length; i++) {
                const lord = contextLords[i];
                const node = currentNodes.find((n: any) => n.planet === lord);
                if (node) {
                    lastParent = node;
                    processedIndex = i + 1; // Successfully processed this level

                    // Try standard nested keys
                    const nextLevel = node.sublevels ||
                        node.antardashas ||
                        node.pratyantardashas ||
                        node.sookshmadashas ||
                        node.pranadashas;

                    if (nextLevel && Array.isArray(nextLevel) && nextLevel.length > 0) {
                        currentNodes = nextLevel;
                        finalList = currentNodes;
                    } else {
                        // Leaf reached in Engine Data.
                        // But we might need to go deeper based on contextLords.
                        finalList = [];
                        break; // Exit engine traversal, switch to calculation
                    }
                } else {
                    // Lord not found in current level
                    finalList = [];
                    break;
                }
            }
        }

        // AUTO-CALCULATION RECURSION
        // If we haven't reached the bottom of contextLords, we must calculate the missing steps.
        // Example: Context [Maha, Antar, Prat, Sookshma]. Engine gave Maha, Antar.
        // processedIndex = 2. We need to process Prat (2) and Sookshma (3) to get Prana list.

        if (lastParent && processedIndex < contextLords.length) {
            logger.info({
                processedDepth: processedIndex,
                targetDepth: contextLords.length,
                parent: lastParent.planet
            }, 'Traversing missing levels via calculation');

            for (let i = processedIndex; i < contextLords.length; i++) {
                const targetLord = contextLords[i];
                if (!targetLord) continue;

                // Calculate children of current lastParent
                const children = calculateSubPeriods(
                    lastParent.planet,
                    lastParent.start_date,
                    lastParent.duration_years,
                    lastParent.end_date
                );

                // Find the next parent in this calculated list
                // Note: normalized comparison is handled inside calculator but result has Title Case
                const nextNode = children.find(c => c.planet === targetLord || c.planet.toLowerCase() === targetLord.toLowerCase());

                if (nextNode) {
                    lastParent = nextNode;
                    // We don't set finalList yet, we are just stepping down
                } else {
                    logger.warn({ targetLord, parent: lastParent.planet }, 'Could not find target lord in calculated sub-periods');
                    lastParent = null;
                    break;
                }
            }
        }

        // Final Step: If we have a valid lastParent (either from Engine or Calculation),
        // and finalList is empty (meaning we need children), OR we just finished calculation traversal...
        // Actually, if we performed calculation traversal, finalList is effectively "pending".
        // We need to return the children of the FINAL lastParent.

        // Condition: We processed ALL context lords (so lastParent is the immediate parent of result).
        // AND finalList is empty (or we want to overwrite root ref).
        if (lastParent && (finalList.length === 0 || finalList === rootList)) {
            // Calculate the final requested list (children of the last context lord)
            finalList = calculateSubPeriods(
                lastParent.planet,
                lastParent.start_date,
                lastParent.duration_years,
                lastParent.end_date
            );
        }

        // BALANCE TREE POPULATION
        // If 'tree' is requested, ensure we have at least 3 levels plus a current 5-level path summary
        if (level === 'tree' && rootList.length > 0) {
            logger.info({ clientId, ayanamsa }, 'Balancing tree depth with path-aware expansion');
            this.populateSublevelsRecursive(rootList, 1, 3, drillDownPath);
            const currentPath = this.extractCurrentPathRecursive(rootList);
            (dashaData as any).curr_path = currentPath;
        }

        const result = {
            clientId,
            clientName: client.fullName,
            level,
            ayanamsa,
            data: dashaData.data,
            cached: dashaData.cached,
            calculatedAt: dashaData.calculatedAt,
        };

        // AUTO-SAVE: If this was a successful engine call, store the exact data in DB
        // unless it's a very specific drill-down (to avoid polluting DB with millions of small branches)
        // However, user wants everything stored, so we save based on 'tree' or top-level.
        if (level === 'tree' || !options.mahaLord) {
            await this.saveChart(tenantId, clientId, {
                chartType: 'dasha_vimshottari',
                chartName: `${client.fullName} - ${level} Vimshottari (${ayanamsa})`,
                chartData: dashaData.data,
                chartConfig: { system: ayanamsa, level, dashaType: 'vimshottari' },
                calculatedAt: new Date(),
                system: ayanamsa,
            }, { userId: 'system' } as any);
        }

        logger.info({ tenantId, clientId, level, ayanamsa }, 'Dasha calculated and cached in DB');

        return result;
    }

    /**
     * Map dasha type string to database enum
     */
    private getDashaChartType(dashaType: string): any {
        const type = dashaType.toLowerCase();
        const mapping: Record<string, string> = {
            'vimshottari': 'dasha_vimshottari',
            'chara': 'dasha_chara',
            'yogini': 'dasha_yogini',
            'ashtottari': 'dasha_ashtottari',
            'tribhagi': 'dasha_tribhagi',
            'tribhagi-40': 'dasha_tribhagi_40',
            'shodashottari': 'dasha_shodashottari',
            'dwadashottari': 'dasha_dwadashottari',
            'panchottari': 'dasha_panchottari',
            'chaturshitisama': 'dasha_chaturshitisama',
            'satabdika': 'dasha_satabdika',
            'dwisaptati': 'dasha_dwisaptati',
            'shastihayani': 'dasha_shastihayani',
            'shattrimshatsama': 'dasha_shattrimshatsama',
            'dasha_3months': 'dasha_3months',
            'dasha_6months': 'dasha_6months',
            'dasha_report_1year': 'dasha_report_1year',
            'dasha_report_2years': 'dasha_report_2years',
            'dasha_report_3years': 'dasha_report_3years',
        };
        return mapping[type] || 'dasha';
    }

    /**
     * Generate dasha and optionally save to database
     */
    async generateAndSaveDasha(
        tenantId: string,
        clientId: string,
        level: string = 'mahadasha',
        ayanamsa: AyanamsaSystem = 'lahiri',
        options: { mahaLord?: string; antarLord?: string; pratyantarLord?: string; sookshmaLord?: string } = {},
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const dashaResult = await this.generateDasha(tenantId, clientId, level, ayanamsa, options);
        const dbChartType = this.getDashaChartType('vimshottari');

        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'dasha_vimshottari',
            chartName: `${client.fullName} - ${level} Vimshottari Dasha (${ayanamsa})`,
            chartData: dashaResult.data,
            chartConfig: { system: ayanamsa, level, dashaType: 'vimshottari' },
            calculatedAt: new Date(),
            system: ayanamsa,
        }, metadata);

        return { ...chart, data: chart.chartData, cached: dashaResult.cached, clientName: client.fullName };
    }

    /**
     * Generate Alternative Dasha Systems
     */
    async generateAlternativeDasha(
        tenantId: string,
        clientId: string,
        dashaType: string,
        ayanamsa: AyanamsaSystem = 'lahiri',
        level: string = 'mahadasha',
        save: boolean = false,
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        // VALIDATION: Ensure dasha type is actually supported for this system
        // This prevents invalid calls (like Tribhagi for Raman) from reaching Astro Engine
        const capabilities = SYSTEM_CAPABILITIES[ayanamsa];
        const normalizedType = dashaType.toLowerCase().replace(/-dasha$/, '');

        const isSupported = capabilities?.dashas?.some(d => d.toLowerCase() === normalizedType || d.toLowerCase() === dashaType.toLowerCase());

        if (!isSupported) {
            logger.warn({
                clientId,
                ayanamsa,
                dashaType,
                supported: capabilities?.dashas
            }, '🛑 Blocked unsupported dasha generation attempt');

            throw new FeatureNotSupportedError(dashaType, ayanamsa);
        }

        const birthData = this.prepareBirthData(client, ayanamsa);

        const dashaData = await astroEngineClient.getAlternativeDasha(birthData, dashaType);

        // ALWAYS SAVE/OVERWRITE: Store exact data from astro engine as requested
        const dbChartType = this.getDashaChartType(dashaType);
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: dbChartType,
            chartName: `${client.fullName} - ${dashaType.replace('-', ' ')} (${ayanamsa})`,
            chartData: dashaData.data,
            chartConfig: { system: ayanamsa, dashaType, level },
            calculatedAt: new Date(),
            system: ayanamsa,
        }, metadata);

        return { ...chart, data: chart.chartData, clientName: client.fullName, ayanamsa, cached: dashaData.cached };
    }

    /**
     * Generate Raw 5-level Dasha (Prana) from Astro Engine
     */
    async generateDeepDasha(tenantId: string, clientId: string, ayanamsa: AyanamsaSystem = 'lahiri', metadata: RequestMetadata) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const birthData = this.prepareBirthData(client, ayanamsa);

        const dashaResult = await astroEngineClient.getPranaDasha(birthData, ayanamsa);
        const finalData = dashaResult.data || dashaResult;

        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'dasha', // Use 'dasha' for Raw Deep Prana
            chartName: `Raw Prana Dasha (${ayanamsa})`,
            chartData: finalData,
            chartConfig: { system: ayanamsa, level: 'prana_raw', dashaType: 'vimshottari' },
            calculatedAt: new Date(),
            system: ayanamsa,
        }, metadata);

        return { ...chart, data: finalData };
    }

    /**
     * Generate all applicable dashas for a system
     */
    async generateAllApplicableDashas(tenantId: string, clientId: string, system: AyanamsaSystem, metadata: RequestMetadata): Promise<void> {
        const capabilities = SYSTEM_CAPABILITIES[system];
        if (!capabilities || !capabilities.dashas) {
            logger.warn({ system, clientId }, 'No dasha capabilities found for system');
            return;
        }

        const ops = capabilities.dashas.map(type => async () => {
            try {
                if (type === 'vimshottari') {
                    // Generate both raw prana (deep) and UI-friendly tree
                    await this.generateDeepDasha(tenantId, clientId, system, metadata);
                    await this.generateDasha(tenantId, clientId, 'tree', system, {});
                } else if (type === 'chara' && system === 'kp') {
                    // Specialized KP Chara Dasha handled via Alternative Dasha
                    await this.generateAlternativeDasha(tenantId, clientId, 'chara', system, 'mahadasha', true, metadata);
                } else if (!['dasha_3months', 'dasha_6months', 'dasha_report_1year', 'dasha_report_2years', 'dasha_report_3years'].includes(type)) {
                    // Generic Alternative Dasha Systems
                    await this.generateAlternativeDasha(tenantId, clientId, type, system, 'mahadasha', true, metadata);
                }
            } catch (err: any) {
                logger.debug({ err: err.message, type, system }, 'Skipped optional dasha generation');
            }
        });
        await executeBatched(ops);
    }

    /**
     * Generate consolidated summary of active periods
     */
    async generateDashaSummary(tenantId: string, clientId: string, ayanamsa: AyanamsaSystem, metadata: RequestMetadata): Promise<void> {
        const charts = await chartRepository.findByClientId(tenantId, clientId);
        const dashaCharts = charts.filter(c => c.chartType.toString().startsWith('dasha_') && (c as any).system === ayanamsa);

        const analysis: any = { activeDashas: {}, calculatedAt: new Date(), system: ayanamsa };

        for (const chart of dashaCharts) {
            const data = (chart.chartData as any);
            const periods = data.dasha_list || (Array.isArray(data) ? data : (data.periods || data.mahadashas || []));
            const current = this.findCurrentDasha(periods);

            if (current) {
                const systemName = chart.chartType.toString().replace('dasha_', '');
                analysis.activeDashas[systemName] = {
                    period: current.planet || current.lord || current.sign,
                    fullPath: this.extractDashaPath(periods),
                    startDate: current.start_date || current.startDate,
                    endDate: current.end_date || current.endDate,
                    progress: this.calculateDashaProgress(current)
                };
            }
        }

        await this.saveChart(tenantId, clientId, {
            chartType: 'dasha_summary',
            chartName: `Active Dasha Analysis (${ayanamsa})`,
            chartData: analysis,
            chartConfig: { system: ayanamsa, analyzed: true },
            calculatedAt: new Date(),
            system: ayanamsa,
        }, metadata);
    }

    private findCurrentDasha(periods: any[]): any {
        if (!Array.isArray(periods) || periods.length === 0) return null;
        const now = new Date();
        const current = periods.find(p => {
            const start = new Date(p.start_date || p.startDate);
            const end = new Date(p.end_date || p.endDate);
            return now >= start && now <= end;
        });
        if (!current) return null;
        if (current.sublevels && Array.isArray(current.sublevels)) {
            const activeSub = this.findCurrentDasha(current.sublevels);
            if (activeSub) return activeSub;
        }
        return current;
    }

    private extractDashaPath(periods: any[]): string[] {
        const path: string[] = [];
        let currentLevel = periods;
        while (currentLevel) {
            const active = this.findCurrentDasha(currentLevel);
            if (!active) break;
            path.push(active.planet || active.lord || active.sign);
            currentLevel = active.sublevels || null;
        }
        return path;
    }

    private calculateDashaProgress(period: any): number {
        const start = new Date(period.start_date || period.startDate).getTime();
        const end = new Date(period.end_date || period.endDate).getTime();
        const now = Date.now();
        if (now < start) return 0;
        if (now > end) return 100;
        return Math.round(((now - start) / (end - start)) * 100);
    }

    /**
     * Recursively populate dasha sublevels down to a specified max level.
     * Path-Aware: If the current period is in the targetPath or isActivePath, we expand to level 5.
     * Returns true if any new levels were calculated.
     */
    private populateSublevelsRecursive(periods: any[], currentLevel: number, defaultMax: number = 3, targetPath: string[] = []): boolean {
        if (currentLevel >= 6 || !Array.isArray(periods)) return false;
        let anyExpanded = false;

        const now = new Date();

        for (const period of periods) {
            const planet = (period.planet || period.lord || '').toLowerCase();
            const targetPlanetAtThisLevel = targetPath[currentLevel - 1]?.toLowerCase();

            // Determine if this specific branch should be deeper
            const isActive = now >= new Date(period.start_date || period.startDate) && now < new Date(period.end_date || period.endDate);
            const isTarget = planet === targetPlanetAtThisLevel;

            // DETERMINISTIC DEPTH STRATEGY:
            // 1. Minimum 3 levels for all branches (allows 2 levels of drill-down).
            // 2. Active branch always 5 levels.
            // 3. User target path (the one in the URL) always 5 levels to ensure absolute stability.
            const effectiveMax = (isActive || isTarget) ? 5 : defaultMax;

            if (currentLevel >= effectiveMax) continue;

            const shouldGoDeeper = currentLevel < effectiveMax;

            if (!shouldGoDeeper) {
                // Just alias keys for frontend consistency if we are stopping here
                period.sublevels = period.sublevels || period.antardashas || period.pratyantardashas || period.sookshmadashas || period.pranadashas;
                continue;
            }

            // Check if sublevels exist or need calculation
            let sublevels = period.sublevels ||
                period.antardashas ||
                period.pratyantardashas ||
                period.sookshmadashas ||
                period.pranadashas;

            if (!sublevels || !Array.isArray(sublevels) || sublevels.length === 0) {
                // Calculate missing sublevels
                sublevels = calculateSubPeriods(
                    period.planet || period.lord,
                    period.start_date || period.startDate,
                    period.duration_years,
                    period.end_date || period.endDate
                );
                // Standardize the key to 'sublevels' for consistency
                period.sublevels = sublevels;
                anyExpanded = true;
            } else {
                // Even if found, move/alias to 'sublevels' to ensure frontend finds it easily
                period.sublevels = sublevels;
            }

            // Recurse to next level
            const nextPathForBranch = isTarget ? targetPath : []; // Only pass path down its OWN branch
            const childExpanded = this.populateSublevelsRecursive(period.sublevels, currentLevel + 1, defaultMax, nextPathForBranch);
            if (childExpanded) anyExpanded = true;
        }
        return anyExpanded;
    }

    /**
     * Specifically extract and fully populate (5 levels) only the CURRENT active path.
     * This is much more efficient than populating the entire 5-level tree.
     */
    private extractCurrentPathRecursive(periods: any[], currentLevelIdx: number = 1): any[] {
        if (currentLevelIdx > 5 || !Array.isArray(periods) || periods.length === 0) return [];

        const now = new Date();
        const activeNode = periods.find(p => {
            const s = new Date(p.start_date || p.startDate);
            const e = new Date(p.end_date || p.endDate);
            return now >= s && now < e;
        });

        if (!activeNode) return [];

        // Ensure this active branch is fully calculated
        let sublevels = activeNode.sublevels ||
            activeNode.antardashas ||
            activeNode.pratyantardashas ||
            activeNode.sookshmadashas ||
            activeNode.pranadashas;

        if (!sublevels || sublevels.length === 0) {
            sublevels = calculateSubPeriods(
                activeNode.planet || activeNode.lord,
                activeNode.start_date || activeNode.startDate,
                activeNode.duration_years,
                activeNode.end_date || activeNode.endDate
            );
            activeNode.sublevels = sublevels;
        }

        const simplifiedNode = {
            planet: activeNode.planet || activeNode.lord,
            startDate: activeNode.start_date || activeNode.startDate,
            endDate: activeNode.end_date || activeNode.endDate,
            level: currentLevelIdx
        };

        return [simplifiedNode, ...this.extractCurrentPathRecursive(sublevels, currentLevelIdx + 1)];
    }

    /**
     * Generate Ashtakavarga for a client (Lahiri/Raman only)
     * This returns Bhinna Ashtakavarga (individual planet scores)
     */
    async generateAshtakavarga(
        tenantId: string,
        clientId: string,
        type: 'bhinna' | 'sarva' | 'shodasha' | 'sarva_ashtakavarga_chart' | 'binnashtakvarga_chart' = 'bhinna',
        ayanamsa: AyanamsaSystem = 'lahiri'
    ) {
        if (ayanamsa === 'kp') {
            throw new Error('Ashtakavarga is not available for KP system');
        }

        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const birthData = this.prepareBirthData(client, ayanamsa);

        let result;
        if (type === 'sarva') {
            result = await astroEngineClient.getSarvaAshtakavarga(birthData, ayanamsa);
        } else if (type === 'shodasha') {
            result = await astroEngineClient.getShodashaVarga(birthData, ayanamsa);
        } else {
            result = await astroEngineClient.getAshtakavarga(birthData, ayanamsa);
        }

        logger.info({ tenantId, clientId, ayanamsa, type }, 'Ashtakavarga calculated');

        return {
            clientId,
            clientName: client.fullName,
            ayanamsa,
            type,
            data: result.data,
            cached: result.cached,
            calculatedAt: result.calculatedAt,
        };
    }

    /**
     * Generate and save Ashtakavarga
     */
    async generateAndSaveAshtakavarga(
        tenantId: string,
        clientId: string,
        type: 'bhinna' | 'sarva' | 'shodasha' | 'sarva_ashtakavarga_chart' | 'binnashtakvarga_chart' = 'bhinna',
        ayanamsa: AyanamsaSystem = 'lahiri',
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const result = await this.generateAshtakavarga(tenantId, clientId, type, ayanamsa);

        const chartTypeMap = {
            'bhinna': 'ashtakavarga_bhinna',
            'sarva': 'ashtakavarga_sarva',
            'shodasha': 'ashtakavarga_shodasha',
            'sarva_ashtakavarga_chart': 'ashtakavarga_sarva',
            'binnashtakvarga_chart': 'ashtakavarga_bhinna'
        } as const;

        const chart = await this.saveChart(tenantId, clientId, {
            chartType: chartTypeMap[type] || 'ashtakavarga_bhinna',
            chartName: `${client.fullName} - ${type.toUpperCase()} Ashtakavarga (${ayanamsa})`,
            chartData: result.data,
            chartConfig: { system: ayanamsa, type },
            calculatedAt: new Date(),
            system: ayanamsa, // Explicitly pass for upsert
        }, metadata);

        return {
            ...chart,
            data: chart.chartData, // Map for frontend
            cached: result.cached,
            clientName: client.fullName,
        };
    }



    /**
     * Generate Sudarshan Chakra for a client
     */
    async generateSudarshanChakra(
        tenantId: string,
        clientId: string,
        ayanamsa: AyanamsaSystem = 'lahiri'
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const birthData = this.prepareBirthData(client, ayanamsa);

        const chakraData = await astroEngineClient.getSudarshanChakra(birthData, ayanamsa);

        logger.info({ tenantId, clientId, ayanamsa }, 'Sudarshan Chakra generated');

        return {
            clientId,
            clientName: client.fullName,
            ayanamsa,
            data: chakraData.data,
            cached: chakraData.cached,
            calculatedAt: chakraData.calculatedAt,
        };
    }

    /**
     * Generate and save Sudarshan Chakra
     */
    async generateAndSaveSudarshanChakra(
        tenantId: string,
        clientId: string,
        ayanamsa: AyanamsaSystem = 'lahiri',
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const result = await this.generateSudarshanChakra(tenantId, clientId, ayanamsa);

        try {
            const chart = await this.saveChart(tenantId, clientId, {
                chartType: 'sudarshana', // Matches enum in schema
                chartName: `${client.fullName} - Sudarshan Chakra (${ayanamsa})`,
                chartData: result.data,
                chartConfig: { system: ayanamsa },
                calculatedAt: new Date(),
                system: ayanamsa, // Explicitly pass for upsert
            }, metadata);

            return {
                ...chart,
                data: chart.chartData, // Map for frontend consistency
                cached: result.cached,
                clientName: client.fullName,
            };
        } catch (error: any) {
            logger.error({
                err: error,
                code: error.code,
                meta: error.meta,
                clientId,
                tenantId
            }, 'Failed to save Sudarshan Chakra chart');
            throw error;
        }
    }

    /**
     * Extract time string from various time value formats
     * Handles PostgreSQL Time type, Date objects, and raw strings
     */
    private extractTimeString(timeValue: Date | string | null | undefined): string {
        if (!timeValue) return '12:00:00';

        if (typeof timeValue === 'string') {
            const segments = timeValue.split(':');
            if (segments.length === 2) return `${timeValue}:00`;
            if (segments.length === 1) return `${timeValue.padStart(2, '0')}:00:00`;
            return timeValue;
        }

        // CRITICAL FIX: prismaData.birthTime is saved using setUTCHours in ClientService.
        // We MUST use getUTC* methods to avoid server-local timezone shifts.
        const hours = timeValue.getUTCHours().toString().padStart(2, '0');
        const mins = timeValue.getUTCMinutes().toString().padStart(2, '0');
        const secs = timeValue.getUTCSeconds().toString().padStart(2, '0');
        return `${hours}:${mins}:${secs}`;
    }

    /**
     * Parse timezone string to offset number
     */
    private parseTimezoneOffset(timezone: string | null): number {
        if (!timezone) return 5.5; // Default to IST if missing

        // 1. Common Indian Standard Time check (Performance Optimization)
        if (timezone.includes('Kolkata') || timezone === 'IST' || timezone === 'Asia/Calcutta') {
            return 5.5;
        }

        // 2. Explicit Offset check (+05:30, -04:00)
        const offsetMatch = timezone.match(/([+-])(\d{1,2}):(\d{2})/);
        if (offsetMatch) {
            const hours = parseInt(offsetMatch[2]);
            const minutes = parseInt(offsetMatch[3]) / 60;
            return offsetMatch[1] === '-' ? -(hours + minutes) : hours + minutes;
        }

        // 3. IANA Timezone Resolution (America/New_York, etc.)
        // Uses Node's built-in ICU data for accurate historical offsets
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                timeZoneName: 'longOffset'
            }).formatToParts(new Date());

            const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value; // e.g., "GMT-04:00"
            if (offsetPart) {
                const match = offsetPart.match(/GMT([+-])(\d{2}):(\d{2})/);
                if (match) {
                    const hours = parseInt(match[2]);
                    const minutes = parseInt(match[3]) / 60;
                    const sign = match[1] === '-' ? -1 : 1;
                    return sign * (hours + minutes);
                }
            }
        } catch (err) {
            logger.warn({ timezone, err }, 'Failed to parse IANA timezone name. Falling back to IST 5.5');
        }

        return 5.5;
    }

    /**
     * Centralized builder for Astro Engine birth data.
     * Ensures all fields (including userName) are consistently mapped.
     */
    private prepareBirthData(client: any, ayanamsa: 'lahiri' | 'raman' | 'kp' | 'yukteswar' | 'western' = 'lahiri'): any {
        if (!client.birthDate || !client.birthTime) {
            throw new Error('Incomplete client birth details');
        }

        return {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude || 0),
            longitude: Number(client.birthLongitude || 0),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            userName: client.fullName || client.name || 'Anonymous',
            ayanamsa: ayanamsa,  // FIXED: Use 'ayanamsa' field, not 'system'
        };
    }

    // =========================================================================
    // KP (KRISHNAMURTI PADDHATI) SYSTEM METHODS
    // =========================================================================

    /**
     * Get KP Planets and Cusps with sub-lords
     */
    async getKpPlanetsCusps(tenantId: string, clientId: string, metadata: RequestMetadata) {
        return this.generateAndSaveChart(tenantId, clientId, 'kp_planets_cusps', 'kp', metadata);
    }

    /**
     * Get KP Ruling Planets
     */
    async getKpRulingPlanets(tenantId: string, clientId: string, metadata: RequestMetadata) {
        return this.generateAndSaveChart(tenantId, clientId, 'kp_ruling_planets', 'kp', metadata);
    }

    /**
     * Get KP Bhava Details
     */
    async getKpBhavaDetails(tenantId: string, clientId: string, metadata: RequestMetadata) {
        return this.generateAndSaveChart(tenantId, clientId, 'kp_bhava_details', 'kp', metadata);
    }

    /**
     * Get KP Significations
     */
    async getKpSignifications(tenantId: string, clientId: string, metadata: RequestMetadata) {
        return this.generateAndSaveChart(tenantId, clientId, 'kp_significations', 'kp', metadata);
    }

    /**
     * Get KP House Significations
     */
    async getKpHouseSignifications(tenantId: string, clientId: string, metadata: RequestMetadata) {
        return this.generateAndSaveChart(tenantId, clientId, 'kp_house_significations', 'kp', metadata);
    }

    /**
     * Get KP Planet Significators
     */
    async getKpPlanetSignificators(tenantId: string, clientId: string, metadata: RequestMetadata) {
        return this.generateAndSaveChart(tenantId, clientId, 'kp_planet_significators', 'kp', metadata);
    }

    /**
     * Get KP Horary (Prashna) Analysis
     */
    async getKpHorary(tenantId: string, clientId: string, horaryNumber: number, question: string, metadata: RequestMetadata) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        // Horary is unique per question/time. 
        // Mapped to 'muhurat' (System: kp) - Semantically "Time Selection / Query"

        const birthData = this.prepareBirthData(client, 'kp');
        const result = await astroEngineClient.getKpHorary({
            ...birthData,
            horaryNumber,
            question
        });

        // Save Horary Result. Warning: 'muhurat' (system 'kp') will be overwritten if we don't handle uniqueness.
        // But since this API replaces the single chart, it's consistent with "Last Generated Horary".
        // Use 'muhurat' type
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'muhurat',
            chartName: `${client.fullName} - Horary #${horaryNumber}`,
            chartData: result,
            chartConfig: { system: 'kp', horaryNumber, question },
            calculatedAt: new Date(),
            system: 'kp'
        }, metadata);

        return {
            success: true,
            data: result,
            calculatedAt: chart.calculatedAt.toISOString(),
            system: 'kp'
        };
    }
    /**
     * Get list of missing charts for a system by comparing capabilities against database
     */
    private async getMissingCharts(tenantId: string, clientId: string, system: AyanamsaSystem): Promise<string[]> {
        const capabilities = SYSTEM_CAPABILITIES[system];
        if (!capabilities) return [];

        const existing = await chartRepository.findMetadataByClientId(tenantId, clientId);
        const existingTypes = new Set(
            existing
                .filter(c => (c as any).system === system) // Strict system filtering
                .map(c => c.chartType!.toString().toLowerCase())
        );

        const expected: string[] = [
            ...capabilities.charts,
            ...capabilities.specialCharts,
        ];

        // 1. ASHTAKAVARGA
        if (capabilities.hasAshtakavarga) {
            expected.push('ashtakavarga_sarva', 'ashtakavarga_bhinna', 'ashtakavarga_shodasha');
        }

        // 2. DASHAS
        if (capabilities.dashas) {
            for (const d of capabilities.dashas) {
                if (d === 'vimshottari') {
                    expected.push('dasha_vimshottari'); // 'dasha' is raw depth, 'dasha_vimshottari' is tree
                    // We check for 'dasha_vimshottari' as the standard marker
                } else {
                    expected.push(`dasha_${d}`);
                }
            }
        }

        // 3. YOGAS
        if (capabilities.yogas) {
            for (const y of capabilities.yogas) {
                expected.push(`yoga_${y}`);
            }
        }

        // 4. DOSHAS
        if (capabilities.doshas) {
            for (const d of capabilities.doshas) {
                expected.push(`dosha_${d}`);
            }
        }

        // 5. REMEDIES
        if (capabilities.remedies) {
            for (const r of capabilities.remedies) {
                expected.push(`remedy_${r}`);
            }
        }

        // 6. PANCHANGA
        if (capabilities.panchanga) {
            for (const p of capabilities.panchanga) {
                if (p === 'panchanga') expected.push('panchanga');
                else expected.push(p); // 'hora', 'choghadiya' etc are direct types
            }
        }

        // Filter out what we already have
        // Normalize expected types to lower case for comparison, but keep original case for return
        return expected.filter(type => {
            const normalized = type.toLowerCase();
            return !existingTypes.has(normalized);
        });
    }
}

export const chartService = new ChartService();

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
        system: 'lahiri' | 'kp' | 'raman',
        metadata: RequestMetadata
    ) {
        // Validate chart type is available for this system
        if (!isChartAvailable(system as AyanamsaSystem, chartType)) {
            logger.warn({ system, chartType, clientId }, 'Requested chart type not available for selected system');
            throw new FeatureNotSupportedError(chartType, system);
        }

        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        // Validate birth details exist
        if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) {
            throw new Error('Client birth details incomplete. Please update birth date, time, and location.');
        }

        // Prepare birth data for astro-engine
        const birthData = {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            ayanamsa: system,
        };

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
    async generateCoreCharts(tenantId: string, clientId: string, metadata: RequestMetadata) {
        const systems: ('lahiri' | 'raman' | 'kp')[] = ['lahiri', 'raman', 'kp'];
        const operations: (() => Promise<any>)[] = [];

        for (const sys of systems) {
            // Systems like KP don't have divisional charts (D9) or Ashtakavarga
            const vargas = sys === 'kp' ? ['D1'] : ['D1', 'D9'];

            for (const varga of vargas) {
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, varga, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, varga }, 'Bulk generation failed for specific chart'))
                );
            }

            // Also generate Ashtakavarga and Sudarshan Chakra for compatible systems
            if (sys !== 'kp') {
                operations.push(() =>
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'sarva', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Bulk Ashtakavarga generation failed'))
                );
                operations.push(() =>
                    this.generateAndSaveSudarshanChakra(tenantId, clientId, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Bulk Sudarshan Chakra generation failed'))
                );
            }
        }

        // Execute in batches
        return executeBatched(operations);
    }

    /**
     * Generate full astrological profile for a client
     * This is exhaustive: all vargas, dashas, and diagrams for all systems
     */
    async generateFullVedicProfile(tenantId: string, clientId: string, metadata: RequestMetadata) {
        const systems: ('lahiri' | 'raman' | 'kp')[] = ['lahiri', 'raman', 'kp'];
        // Use thunks (factory functions) for batched execution
        const operations: (() => Promise<any>)[] = [];

        for (const sys of systems) {
            const capabilities = SYSTEM_CAPABILITIES[sys];
            if (!capabilities) continue;

            logger.info({ tenantId, clientId, system: sys }, 'Generating exhaustive profile for system');

            // 1. Generate all Divisional Charts
            for (const varga of capabilities.charts) {
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, varga, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, varga }, 'Full profile: Divisional chart failed'))
                );
            }

            // 2. Generate all Special Charts (Arudha, Bhava, Hora, Karkamsha, etc.)
            for (const special of capabilities.specialCharts) {
                // Skip those handled by specific methods or already handled
                if (['sudarshan', 'ashtakavarga', 'dasha', 'sun', 'moon'].includes(special)) continue;

                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, special, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, special }, `Full profile: Special chart ${special} failed`))
                );
            }

            // 3. Generate Ashtakavarga (if available)
            if (capabilities.hasAshtakavarga) {
                operations.push(() =>
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'sarva', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: SAV failed'))
                );
                operations.push(() =>
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'bhinna', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: BAV failed'))
                );
                operations.push(() =>
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'shodasha', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Shodasha Varga Summary failed'))
                );
            }

            // 4. Generate Sudarshan Chakra (if available)
            if (capabilities.specialCharts.includes('sudarshan')) {
                operations.push(() =>
                    this.generateAndSaveSudarshanChakra(tenantId, clientId, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Sudarshan failed'))
                );
            }

            // 5. Generate Sun and Moon Charts (if available)
            if (capabilities.specialCharts.includes('sun')) {
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, 'SUN', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Sun chart failed'))
                );
            }
            if (capabilities.specialCharts.includes('moon')) {
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, 'MOON', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Moon chart failed'))
                );
            }

            // 6. Generate Yogas (if available)
            if (capabilities.yogas) {
                for (const yoga of capabilities.yogas) {
                    operations.push(() =>
                        this.generateAndSaveChart(tenantId, clientId, `yoga:${yoga}`, sys, metadata)
                            .catch(err => logger.error({ err, clientId, sys, yoga }, 'Full profile: Yoga failed'))
                    );
                }
            }

            // 7. Generate Doshas (if available)
            if (capabilities.doshas) {
                for (const dosha of capabilities.doshas) {
                    operations.push(() =>
                        this.generateAndSaveChart(tenantId, clientId, `dosha:${dosha}`, sys, metadata)
                            .catch(err => logger.error({ err, clientId, sys, dosha }, 'Full profile: Dosha failed'))
                    );
                }
            }

            // 8. Generate Remedies (if available)
            if (capabilities.remedies) {
                for (const remedy of capabilities.remedies) {
                    operations.push(() =>
                        this.generateAndSaveChart(tenantId, clientId, `remedy:${remedy}`, sys, metadata)
                            .catch(err => logger.error({ err, clientId, sys, remedy }, 'Full profile: Remedy failed'))
                    );
                }
            }

            // 9. Generate Panchanga & Reports (if available)
            if (capabilities.panchanga) {
                for (const report of capabilities.panchanga) {
                    operations.push(() =>
                        this.generateAndSaveChart(tenantId, clientId, `panchanga:${report}`, sys, metadata)
                            .catch(err => logger.error({ err, clientId, sys, report }, 'Full profile: Panchanga/Report failed'))
                    );
                }
            }

            // 10. Generate Dashas (if available) - NEW
            if (capabilities.dashas) {
                for (const dashaType of capabilities.dashas) {
                    operations.push(() =>
                        this.generateAndSaveChart(tenantId, clientId, `dasha:${dashaType}`, sys, metadata)
                            .catch(err => logger.info({ err, dashaType }, 'Batch dasha generation skip/fail'))
                    );
                }
            }

            // 11. Generate Shadbala (if available)
            if (capabilities.specialCharts.includes('shadbala')) {
                operations.push(() =>
                    this.generateAndSaveChart(tenantId, clientId, 'shadbala', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Shadbala failed'))
                );
            }

            // 12. Generate Exhaustive Dasha Tree (Maha to Prana)
            // This replaces the experimental Deep Dasha with a production-ready tree
            operations.push(() =>
                this.generateDeepDasha(tenantId, clientId, sys, metadata)
                    .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Dasha tree failed'))
            );
        }

        // Execute in batches to avoid Supabase connection pool exhaustion
        logger.info({ tenantId, clientId, operationCount: operations.length }, 'Starting batched profile generation');
        const resolved = await executeBatched(operations);
        logger.info({ tenantId, clientId, count: resolved.length }, 'Full Vedic Profile generation completed');
        return { success: true, count: resolved.length };
    }

    /**
     * Generate full profiles for all clients in a tenant
     */
    async generateBulkCharts(tenantId: string, metadata: RequestMetadata) {
        const clients = await clientRepository.findMany(tenantId, { take: 1000 });

        logger.info({ tenantId, clientCount: clients.length }, 'Starting exhaustive bulk generation for all clients');

        const operations = clients
            .filter(client => client.birthDate && client.birthTime && client.birthLatitude && client.birthLongitude)
            .map(client => () =>
                this.generateFullVedicProfile(tenantId, client.id, metadata)
                    .catch(err => logger.error({ err, clientId: client.id }, 'Bulk complete profile failed for client'))
            );

        return executeBatched(operations, 1); // Only 1 client at a time for bulk operations
    }

    /**
     * Ensure a client has a complete Vedic profile
     * DYNAMICALLY checks SYSTEM_CAPABILITIES against database and generates missing charts
     * IMPORTANT: Uses setImmediate to be fully non-blocking
     */
    async ensureFullVedicProfile(tenantId: string, clientId: string, metadata: RequestMetadata, existingCharts?: any[]) {
        // Defer all checks to next tick to avoid blocking getClient response
        setImmediate(async () => {
            try {
                // Prevent concurrent generation for the same client
                if (generationLocks.has(clientId)) {
                    logger.debug({ clientId }, 'Profile generation already in progress, skipping ensure');
                    return;
                }

                // Set lock immediately to protect the audit phase too
                generationLocks.add(clientId);

                // Use passed charts if available, otherwise fetch only metadata to save bandwidth
                const existing = existingCharts || await chartRepository.findMetadataByClientId(tenantId, clientId);

                // Get all existing chart types grouped by system
                // Get all existing chart types grouped by system with timestamps
                const existingBySystem: Record<string, Map<string, Date>> = {};
                for (const chart of existing) {
                    const system = (chart as any).system || 'lahiri'; // Metadata or Full both have this
                    if (!existingBySystem[system]) {
                        existingBySystem[system] = new Map();
                    }
                    if (chart.chartType) {
                        existingBySystem[system].set(chart.chartType.toLowerCase(), chart.calculatedAt || new Date(0));
                    }
                }

                // Check each system for missing charts using SYSTEM_CAPABILITIES as source of truth
                const systemsToCheck: ('lahiri' | 'raman' | 'kp')[] = ['lahiri', 'raman', 'kp'];
                const allMissingCharts: { system: 'lahiri' | 'raman' | 'kp'; charts: string[] }[] = [];

                for (const sys of systemsToCheck) {
                    const capabilities = SYSTEM_CAPABILITIES[sys];
                    if (!capabilities) continue;

                    if (!capabilities) continue;

                    const existingForSystem = existingBySystem[sys] || new Map<string, Date>();

                    // Build expected chart list from capabilities
                    const expectedCharts: string[] = [
                        ...capabilities.charts, // D1, D2, D3, etc.
                        ...capabilities.specialCharts, // transit, arudha_lagna, bhava_lagna, karkamsha_d9, etc.
                    ];

                    // Add ashtakavarga types if supported
                    if (capabilities.hasAshtakavarga) {
                        expectedCharts.push('ashtakavarga_sarva', 'ashtakavarga_bhinna', 'ashtakavarga_shodasha');
                    }

                    // Add dasha
                    expectedCharts.push('dasha');

                    // Find missing charts for this system
                    const missingForSystem = expectedCharts.filter(chart => {
                        const chartKey = chart.toLowerCase();
                        const existingDate = existingForSystem.get(chartKey);

                        if (!existingDate) return true; // Completely missing

                        // For transit, regenerate if older than 1 hour to ensure freshness without spamming
                        if (chartKey === 'transit') {
                            const age = Date.now() - existingDate.getTime();
                            // 1 hour = 3600000 ms
                            return age > 3600000;
                        }

                        return false;
                    });

                    if (missingForSystem.length > 0) {
                        allMissingCharts.push({ system: sys, charts: missingForSystem });
                    }
                }

                // If no missing charts, we're done
                if (allMissingCharts.length === 0) {
                    logger.debug({ clientId }, 'All charts present for all systems');
                    generationLocks.delete(clientId);
                    return;
                }

                // Log what's missing
                const totalMissing = allMissingCharts.reduce((acc, m) => acc + m.charts.length, 0);
                logger.info({
                    tenantId,
                    clientId,
                    totalMissing,
                    breakdown: allMissingCharts.map(m => ({ system: m.system, count: m.charts.length, charts: m.charts.slice(0, 5) }))
                }, 'Generating missing charts');

                // Generate missing charts for each system
                try {
                    for (const { system, charts } of allMissingCharts) {
                        await this.generateMissingCharts(tenantId, clientId, charts, system, metadata);
                    }
                    logger.info({ clientId, totalMissing }, 'Missing charts generation completed');
                } catch (err: any) {
                    logger.error({ err, clientId }, 'Missing charts generation failed');
                } finally {
                    generationLocks.delete(clientId);
                }

            } catch (err: any) {
                logger.warn({ err, clientId }, 'Failed to perform automatic profile audit');
                generationLocks.delete(clientId);
            }
        });
    }

    /**
     * Generate only specific missing charts (more efficient than full regeneration)
     * Uses endpoint failure tracking to skip known-failing endpoints
     */
    private async generateMissingCharts(
        tenantId: string,
        clientId: string,
        missingCharts: string[],
        system: 'lahiri' | 'raman' | 'kp',
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
            } else if (lowerType === 'dasha') {
                operations.push(() =>
                    this.generateDeepDasha(tenantId, clientId, system, metadata)
                        .catch(err => {
                            if (err?.statusCode === 404 || err?.statusCode === 500) {
                                markEndpointFailed(system, chartType);
                            }
                            logger.warn({ clientId, chartType, system }, 'Chart generation failed - endpoint marked');
                        })
                );
            } else {
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
        ayanamsa: 'lahiri' | 'kp' | 'raman' = 'lahiri',
        options: { mahaLord?: string; antarLord?: string; pratyantarLord?: string; sookshmaLord?: string } = {}
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) {
            throw new Error('Client birth details incomplete.');
        }

        const birthData = {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            ayanamsa, // Ensure ayanamsa is passed for routing
        };

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


        logger.info({ tenantId, clientId, level, ayanamsa }, 'Dasha calculated');

        return {
            clientId,
            clientName: client.fullName,
            level,
            ayanamsa,
            data: dashaData.data,
            cached: dashaData.cached,
            calculatedAt: dashaData.calculatedAt,
        };
    }

    /**
     * Generate dasha and optionally save to database
     */
    async generateAndSaveDasha(
        tenantId: string,
        clientId: string,
        level: string = 'mahadasha',
        ayanamsa: 'lahiri' | 'kp' | 'raman' = 'lahiri',
        options: { mahaLord?: string; antarLord?: string; pratyantarLord?: string; sookshmaLord?: string } = {},
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        // Generate dasha data
        const dashaResult = await this.generateDasha(tenantId, clientId, level, ayanamsa, options);

        // Save to database as chart type 'dasha'
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'dasha',
            chartName: `${client.fullName} - ${level} Dasha (${ayanamsa})`,
            chartData: dashaResult.data,
            chartConfig: { system: ayanamsa, level },
            calculatedAt: new Date(),
        }, metadata);

        logger.info({ tenantId, clientId, level, ayanamsa, chartId: chart.id }, 'Dasha generated and saved');

        return {
            ...chart,
            data: chart.chartData, // Map for frontend
            cached: dashaResult.cached,
            clientName: client.fullName,
        };
    }

    /**
     * Generate Other Dasha Systems (Tribhagi, Shodashottari, Dwadashottari, etc.)
     * Available types: tribhagi, shodashottari, dwadashottari, panchottari, 
     * chaturshitisama, satabdika, dwisaptati, shastihayani, shattrimshatsama, chara
     */
    async generateOtherDasha(
        tenantId: string,
        clientId: string,
        dashaType: string,
        ayanamsa: 'lahiri' | 'kp' | 'raman' = 'lahiri'
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) {
            throw new Error('Client birth details incomplete.');
        }

        const birthData = {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            ayanamsa,
        };

        const dashaData = await astroEngineClient.getOtherDasha(birthData, dashaType, ayanamsa);

        logger.info({ tenantId, clientId, dashaType, ayanamsa }, 'Other Dasha calculated');

        return {
            clientId,
            clientName: client.fullName,
            dashaType,
            ayanamsa,
            data: dashaData.data,
            cached: dashaData.cached,
            calculatedAt: dashaData.calculatedAt,
        };
    }

    /**
     * Generate Exhaustive 5-level Dasha Tree (Maha to Prana)
     * Fetches Level 1 from Engine and calculates the rest recursively.
     */
    async generateDeepDasha(
        tenantId: string,
        clientId: string,
        ayanamsa: 'lahiri' | 'kp' | 'raman' = 'lahiri',
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const birthData = {
            birthDate: client.birthDate!.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            userName: client.fullName,
            system: ayanamsa
        };

        // 1. Fetch Mahadashas from Engine (anchors)
        logger.info({ clientId, ayanamsa }, 'Fetching Dasha Anchors (Level 1)');
        const mahaResult = await astroEngineClient.getVimshottariDasha(birthData, 'mahadasha');
        const mahaResData = (mahaResult as any).data || mahaResult;
        const mahaList = mahaResData.dasha_list || mahaResData.mahadashas || [];

        if (!mahaList.length) {
            throw new Error('Could not fetch Mahadasha list from engine');
        }

        // 2. Recursively calculate up to level 5 (Prana)
        // This ensures the frontend has the full hierarchy pre-loaded
        logger.info({ clientId }, 'Building 5-level recursive Dasha tree');
        const fullTree = mahaList.map((maha: any) => ({
            ...maha,
            sublevels: this.calculateRecursiveDasha(maha.planet, maha.start_date, maha.duration_years || 0, 2, 5)
        }));

        const finalData = {
            dasha_list: fullTree,
            type: 'exhaustive_vimshottari',
            system: ayanamsa,
            levels: 5
        };

        // 3. Save (Repository handles upsert now)
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'dasha',
            chartName: `Vimshottari Dasha Tree (${ayanamsa})`,
            chartData: finalData,
            chartConfig: { system: ayanamsa, level: 'mahadasha_to_prana' },
            calculatedAt: new Date(),
            system: ayanamsa, // Explicitly pass for upsert
        }, metadata);

        return {
            ...chart,
            data: finalData
        };
    }

    /**
     * Recursive helper for building the dasha tree
     */
    private calculateRecursiveDasha(
        parentPlanet: string,
        start: string | Date,
        duration: number,
        currentLevel: number,
        maxLevel: number
    ): any[] {
        if (currentLevel > maxLevel || duration <= 0) return [];

        const subPeriods = calculateSubPeriods(parentPlanet, start, duration);
        return subPeriods.map(sp => ({
            ...sp,
            sublevels: this.calculateRecursiveDasha(
                sp.planet,
                sp.start_date,
                sp.duration_years,
                currentLevel + 1,
                maxLevel
            )
        }));
    }

    /**
     * Generate Ashtakavarga for a client (Lahiri/Raman only)
     * This returns Bhinna Ashtakavarga (individual planet scores)
     */
    async generateAshtakavarga(
        tenantId: string,
        clientId: string,
        type: 'bhinna' | 'sarva' | 'shodasha' = 'bhinna',
        ayanamsa: 'lahiri' | 'raman' | 'kp' = 'lahiri'
    ) {
        if (ayanamsa === 'kp') {
            throw new Error('Ashtakavarga is not available for KP system');
        }

        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) {
            throw new Error('Client birth details incomplete.');
        }

        const birthData = {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            ayanamsa,
        };

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
        type: 'bhinna' | 'sarva' | 'shodasha' = 'bhinna',
        ayanamsa: 'lahiri' | 'raman' | 'kp' = 'lahiri',
        metadata: RequestMetadata
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const result = await this.generateAshtakavarga(tenantId, clientId, type, ayanamsa);

        const chartTypeMap = {
            'bhinna': 'ashtakavarga_bhinna',
            'sarva': 'ashtakavarga_sarva',
            'shodasha': 'ashtakavarga_shodasha'
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
        ayanamsa: 'lahiri' | 'raman' | 'kp' = 'lahiri'
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) {
            throw new Error('Client birth details incomplete.');
        }

        const birthData = {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: this.extractTimeString(client.birthTime),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
        };

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
        ayanamsa: 'lahiri' | 'raman' | 'kp' = 'lahiri',
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
            // Ensure format is HH:MM:SS. If HH:MM, append :00
            const segments = timeValue.split(':');
            if (segments.length === 2) {
                return `${timeValue}:00`;
            }
            if (segments.length === 1) {
                return `${timeValue.padStart(2, '0')}:00:00`;
            }
            return timeValue;
        }

        // For Time type stored in DB (Date object), use local time to avoid timezone issues
        const hours = timeValue.getHours().toString().padStart(2, '0');
        const mins = timeValue.getMinutes().toString().padStart(2, '0');
        const secs = timeValue.getSeconds().toString().padStart(2, '0');
        return `${hours}:${mins}:${secs}`;
    }

    /**
     * Parse timezone string to offset number
     */
    private parseTimezoneOffset(timezone: string | null): number {
        if (!timezone) return 5.5; // Default to IST

        // Handle common formats like "Asia/Kolkata", "+05:30", "IST"
        if (timezone.includes('Kolkata') || timezone === 'IST') return 5.5;
        if (timezone.startsWith('+') || timezone.startsWith('-')) {
            const match = timezone.match(/([+-])(\d{2}):(\d{2})/);
            if (match) {
                const hours = parseInt(match[2]);
                const minutes = parseInt(match[3]) / 60;
                return match[1] === '-' ? -(hours + minutes) : hours + minutes;
            }
        }

        return 5.5; // Default fallback
    }
}

export const chartService = new ChartService();


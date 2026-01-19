import { chartRepository } from '../repositories/chart.repository';
import { clientRepository } from '../repositories/client.repository';
import { ClientNotFoundError } from '../errors/client.errors';
import { eventPublisher } from './event.publisher';
import { activityService } from './activity.service';
import { RequestMetadata } from './client.service';
import { astroEngineClient } from '../clients/astro-engine.client';
import { calculateSubPeriods } from '../utils/vimshottari-calc';
import { logger, isChartAvailable, getAvailableCharts, AyanamsaSystem, SYSTEM_CAPABILITIES } from '../config';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        // Pre-emptive technical audit and generation whenever charts are fetched
        // This is a safety layer to ensure data is updated/assigned correctly
        if (metadata) {
            this.ensureFullVedicProfile(tenantId, clientId, metadata);
        }
        return chartRepository.findByClientId(tenantId, clientId);
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
            throw new Error(`Chart type ${chartType} is not available for ${system} system. Available: ${getAvailableCharts(system as AyanamsaSystem).join(', ')}`);
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
            chartData = await astroEngineClient.getBhavaDetails(birthData); // KP specific method
            dbChartType = 'kp_bhava';
        } else if (normalizedType === 'equal_bhava') {
            chartData = await astroEngineClient.getBhavaLagna(birthData, system); // Fallback to bhava for equal if not specific
            dbChartType = 'equal_bhava';
        } else if (normalizedType === 'karkamsha') {
            chartData = await astroEngineClient.getArudhaLagna(birthData, system); // Fallback to arudha if karkamsha not specific
            dbChartType = 'karkamsha';
        } else if (normalizedType === 'karkamsha_d1') {
            chartData = await astroEngineClient.getKarkamshaD1(birthData, system);
            dbChartType = 'karkamsha_d1';
        } else if (normalizedType === 'karkamsha_d9') {
            chartData = await astroEngineClient.getKarkamshaD9(birthData, system);
            dbChartType = 'karkamsha_d9';
        } else if (normalizedType === 'transit') {
            chartData = await astroEngineClient.getTransitChart(birthData, system);
            dbChartType = 'transit';
        } else if (normalizedType === 'sudarshan' || normalizedType === 'sudarshana') {
            chartData = await astroEngineClient.getSudarshanChakra(birthData, system);
            dbChartType = 'sudarshana';
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

        const results = [];
        for (const sys of systems) {
            // Systems like KP don't have divisional charts (D9) or Ashtakavarga
            const vargas = sys === 'kp' ? ['D1'] : ['D1', 'D9'];

            for (const varga of vargas) {
                results.push(
                    this.generateAndSaveChart(tenantId, clientId, varga, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, varga }, 'Bulk generation failed for specific chart'))
                );
            }

            // Also generate Ashtakavarga and Sudarshan Chakra for compatible systems
            if (sys !== 'kp') {
                results.push(
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'sarva', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Bulk Ashtakavarga generation failed'))
                );
                results.push(
                    this.generateAndSaveSudarshanChakra(tenantId, clientId, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Bulk Sudarshan Chakra generation failed'))
                );
            }
        }

        return Promise.all(results);
    }

    /**
     * Generate core charts for all clients in a tenant
     */
    /**
     * Generate full astrological profile for a client
     * This is exhaustive: all vargas, dashas, and diagrams for all systems
     */
    async generateFullVedicProfile(tenantId: string, clientId: string, metadata: RequestMetadata) {
        const systems: ('lahiri' | 'raman' | 'kp')[] = ['lahiri', 'raman', 'kp'];
        const results = [];

        for (const sys of systems) {
            const capabilities = SYSTEM_CAPABILITIES[sys];
            if (!capabilities) continue;

            // 1. Generate all Divisional Charts
            for (const varga of capabilities.charts) {
                results.push(
                    this.generateAndSaveChart(tenantId, clientId, varga, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, varga }, 'Full profile: Divisional chart failed'))
                );
            }

            // 2. Generate Ashtakavarga (if available)
            if (capabilities.hasAshtakavarga) {
                results.push(
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'sarva', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: SAV failed'))
                );
                results.push(
                    this.generateAndSaveAshtakavarga(tenantId, clientId, 'bhinna', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: BAV failed'))
                );
            }

            // 3. Generate Sudarshan Chakra (if available)
            if (capabilities.specialCharts.includes('sudarshan')) {
                results.push(
                    this.generateAndSaveSudarshanChakra(tenantId, clientId, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Sudarshan failed'))
                );
            }

            // 4. Generate Sun and Moon Charts (if available)
            if (capabilities.specialCharts.includes('sun')) {
                results.push(
                    this.generateAndSaveChart(tenantId, clientId, 'SUN', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Sun chart failed'))
                );
            }
            if (capabilities.specialCharts.includes('moon')) {
                results.push(
                    this.generateAndSaveChart(tenantId, clientId, 'MOON', sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Moon chart failed'))
                );
            }

            // 5. Generate Deep Dasha (Maha + Antar)
            results.push(
                this.generateDeepDasha(tenantId, clientId, sys, metadata)
                    .catch(err => logger.error({ err, clientId, sys }, 'Full profile: Deep Dasha failed'))
            );
        }

        const resolved = await Promise.all(results);
        logger.info({ tenantId, clientId, count: resolved.length }, 'Full Vedic Profile generation completed');
        return { success: true, count: resolved.length };
    }

    /**
     * Generate full profiles for all clients in a tenant
     */
    async generateBulkCharts(tenantId: string, metadata: RequestMetadata) {
        const clients = await clientRepository.findMany(tenantId, { take: 1000 });

        logger.info({ tenantId, clientCount: clients.length }, 'Starting exhaustive bulk generation for all clients');

        const results = [];
        for (const client of clients) {
            if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) continue;

            results.push(
                this.generateFullVedicProfile(tenantId, client.id, metadata)
                    .catch(err => logger.error({ err, clientId: client.id }, 'Bulk complete profile failed for client'))
            );
        }

        return Promise.all(results);
    }

    /**
     * Ensure a client has a complete Vedic profile (Lahiri focus)
     * Triggers generation if critical charts are missing
     */
    async ensureFullVedicProfile(tenantId: string, clientId: string, metadata: RequestMetadata) {
        try {
            const existing = await chartRepository.findByClientId(tenantId, clientId);

            // Heuristic check: Lahiri system should have ~18+ entries for a full profile (16 vargas + SAV + BAV + Dasha + Sudarshan)
            const lahiriCharts = existing.filter(c => {
                const config = c.chartConfig as any;
                return (config?.system === 'lahiri' || !config?.system); // null system often means default lahiri
            });

            if (lahiriCharts.length < 18) {
                logger.info({ tenantId, clientId, count: lahiriCharts.length }, 'Target client profile incomplete. Auditing and generating exhaustive charts.');
                // Trigger in background to avoid blocking getClient response
                // but starts the process "whenever astrologers select the client"
                this.generateFullVedicProfile(tenantId, clientId, metadata)
                    .catch(err => logger.error({ err, clientId }, 'Pre-emptive profile generation failed'));
            }
        } catch (err) {
            logger.warn({ err, clientId }, 'Failed to perform automatic profile audit');
        }
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
     * EXPERIMENTAL: Generate Deep Dasha Tree (Maha + Antar)
     * Fetches Level 1 (Maha) and Level 2 (Antar) for the entire 120y cycle.
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

        // 1. Fetch Mahadashas
        logger.info({ clientId }, 'Fetching Deep Dasha: Level 1 (Maha)');
        const mahaResult = await astroEngineClient.getVimshottariDasha(birthData, 'mahadasha');
        const mahaResData = (mahaResult as any).data || mahaResult;
        const mahaList = mahaResData.dasha_list || mahaResData.mahadashas || [];

        // 2. Fetch Antardashas for each Maha (if not already present)
        logger.info({ clientId, count: mahaList.length }, 'Processing Deep Dasha: Level 2 (Antar)');

        const deepList = await Promise.all(mahaList.map(async (maha: any) => {
            // Check if nested data already exists (optimization)
            const nested = maha.sublevels || maha.antardashas || maha.dasha_list;
            if (nested && nested.length > 0) {
                return {
                    ...maha,
                    sublevels: nested // Standardize name
                };
            }

            // Fallback: Fetch explicitly if missing
            try {
                const antarResult = await astroEngineClient.getVimshottariDasha(birthData, 'antardasha', { mahaLord: maha.planet });
                // Handle various response shapes
                const antarData = (antarResult as any).data || antarResult;
                const antarList = antarData.dasha_list || antarData.antardashas || [];
                return {
                    ...maha,
                    sublevels: antarList
                };
            } catch (error) {
                logger.warn({ maha: maha.planet, error }, 'Failed to fetch antardasha');
                return { ...maha, sublevels: [] }; // Fallback
            }
        }));

        // 3. Construct Final Structure
        const finalData = {
            dasha_list: deepList,
            type: 'deep_vimshottari',
            system: ayanamsa
        };

        // 4. Save
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'dasha',
            chartName: `${client.fullName} - Vimshottari Deep Tree (${ayanamsa})`,
            chartData: finalData,
            chartConfig: { system: ayanamsa, level: 'deep_maha_antar' },
            calculatedAt: new Date(),
        }, metadata);

        return {
            ...chart,
            data: finalData
        };
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

        const chart = await this.saveChart(tenantId, clientId, {
            chartType: 'ashtakavarga',
            chartName: `${client.fullName} - ${type.toUpperCase()} Ashtakavarga (${ayanamsa})`,
            chartData: result.data,
            chartConfig: { system: ayanamsa, type },
            calculatedAt: new Date(),
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
        if (typeof timeValue === 'string') return timeValue;
        // For Time type stored in DB, use local time to avoid timezone issues
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


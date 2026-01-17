import { chartRepository } from '../repositories/chart.repository';
import { clientRepository } from '../repositories/client.repository';
import { ClientNotFoundError } from '../errors/client.errors';
import { eventPublisher } from './event.publisher';
import { activityService } from './activity.service';
import { RequestMetadata } from './client.service';
import { astroEngineClient } from '../clients/astro-engine.client';
import { logger, isChartAvailable, getAvailableCharts, AyanamsaSystem } from '../config';

export class ChartService {
    /**
     * Save a chart for a client
     */
    async saveChart(tenantId: string, clientId: string, data: any, metadata: RequestMetadata) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        const chart = await chartRepository.create(tenantId, {
            ...data,
            clientId,
            createdBy: metadata.userId
        });

        // Record activity
        await activityService.recordActivity({
            tenantId,
            clientId,
            userId: metadata.userId,
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
    async getClientCharts(tenantId: string, clientId: string) {
        return chartRepository.findByClientId(tenantId, clientId);
    }

    /**
     * Delete saved chart
     */
    async deleteChart(tenantId: string, id: string, metadata: RequestMetadata) {
        const chart = await chartRepository.findById(tenantId, id);

        await chartRepository.delete(tenantId, id);

        // Record activity
        await activityService.recordActivity({
            tenantId,
            clientId: chart?.clientId,
            userId: metadata.userId,
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
            birthTime: client.birthTime.toISOString().split('T')[1].slice(0, 8),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            ayanamsa: system,
        };

        // Call astro-engine service with Ayanamsa-aware routing
        let chartData;
        if (chartType === 'D1' || chartType.toLowerCase() === 'natal') {
            chartData = await astroEngineClient.getNatalChart(birthData, system);
        } else {
            chartData = await astroEngineClient.getDivisionalChart(birthData, chartType, system);
        }

        // Save chart to database
        const chart = await this.saveChart(tenantId, clientId, {
            chartType: chartType.toUpperCase(),
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
            // Systems like KP don't have divisional charts (D9), only Natal (D1)
            const vargas = sys === 'kp' ? ['D1'] : ['D1', 'D9'];

            for (const varga of vargas) {
                results.push(
                    this.generateAndSaveChart(tenantId, clientId, varga, sys, metadata)
                        .catch(err => logger.error({ err, clientId, sys, varga }, 'Bulk generation failed for specific chart'))
                );
            }
        }

        return Promise.all(results);
    }

    /**
     * Generate dasha periods for a client (Ayanamsa-aware)
     */
    async generateDasha(
        tenantId: string,
        clientId: string,
        level: string = 'mahadasha',
        ayanamsa: 'lahiri' | 'kp' | 'raman' = 'lahiri',
        options: { mahaLord?: string; antarLord?: string; pratyantarLord?: string } = {}
    ) {
        const client = await clientRepository.findById(tenantId, clientId);
        if (!client) throw new ClientNotFoundError(clientId);

        if (!client.birthDate || !client.birthTime || !client.birthLatitude || !client.birthLongitude) {
            throw new Error('Client birth details incomplete.');
        }

        const birthData = {
            birthDate: client.birthDate.toISOString().split('T')[0],
            birthTime: client.birthTime.toISOString().split('T')[1].slice(0, 8),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
            ayanamsa, // Ensure ayanamsa is passed for routing
        };

        const dashaData = await astroEngineClient.getVimshottariDasha(birthData, level, options);

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
        options: { mahaLord?: string; antarLord?: string; pratyantarLord?: string } = {},
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
            cached: dashaResult.cached,
            clientName: client.fullName,
        };
    }

    /**
     * Generate Ashtakavarga for a client (Lahiri/Raman only)
     */
    async generateAshtakavarga(
        tenantId: string,
        clientId: string,
        ayanamsa: 'lahiri' | 'raman' | 'kp' = 'lahiri'
    ) {
        // KP system doesn't support Ashtakavarga
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
            birthTime: client.birthTime.toISOString().split('T')[1].slice(0, 8),
            latitude: Number(client.birthLatitude),
            longitude: Number(client.birthLongitude),
            timezoneOffset: this.parseTimezoneOffset(client.birthTimezone),
        };

        const ashtakavargaData = await astroEngineClient.getAshtakavarga(birthData, ayanamsa);

        logger.info({ tenantId, clientId, ayanamsa }, 'Ashtakavarga calculated');

        return {
            clientId,
            clientName: client.fullName,
            ayanamsa,
            data: ashtakavargaData.data,
            cached: ashtakavargaData.cached,
            calculatedAt: ashtakavargaData.calculatedAt,
        };
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


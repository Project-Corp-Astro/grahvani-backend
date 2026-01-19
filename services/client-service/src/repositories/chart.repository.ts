import { PrismaClient, ClientSavedChart, ChartType } from '../generated/prisma';
import { getPrismaClient } from '../config/database';

export class ChartRepository {
    private prisma = getPrismaClient();

    /**
     * Find saved charts for a client
     */
    async findByClientId(tenantId: string, clientId: string) {
        return this.prisma.clientSavedChart.findMany({
            where: { tenantId, clientId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Find specific chart by ID
     */
    async findById(tenantId: string, id: string): Promise<ClientSavedChart | null> {
        return this.prisma.clientSavedChart.findFirst({
            where: { id, tenantId }
        });
    }

    /**
     * Save a chart
     */
    async create(tenantId: string, data: {
        clientId: string;
        chartType: ChartType;
        system?: string;
        chartName?: string;
        chartData: any;
        chartConfig?: any;
        chartImageUrl?: string;
        calculatedAt?: Date;
        createdBy?: string;
    }) {
        const { clientId, chartType, system, ...rest } = data;
        const calculatedAt = data.calculatedAt || new Date();

        return this.prisma.clientSavedChart.upsert({
            where: {
                tenantId_clientId_chartType_system: {
                    tenantId,
                    clientId,
                    chartType,
                    system: system || 'lahiri'
                }
            },
            update: {
                ...rest,
                calculatedAt
            },
            create: {
                ...data,
                tenantId,
                calculatedAt,
                system: system || 'lahiri'
            }
        });
    }

    /**
     * Delete a saved chart
     */
    async delete(tenantId: string, id: string) {
        return this.prisma.clientSavedChart.delete({
            where: { id, tenantId }
        });
    }
}

export const chartRepository = new ChartRepository();

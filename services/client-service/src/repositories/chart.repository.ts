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
        chartName?: string;
        chartType: ChartType;
        chartData: any;
        chartConfig?: any;
        chartImageUrl?: string;
        calculatedAt?: Date;
        createdBy?: string;
    }) {
        return this.prisma.clientSavedChart.create({
            data: {
                ...data,
                tenantId,
                calculatedAt: data.calculatedAt || new Date()
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

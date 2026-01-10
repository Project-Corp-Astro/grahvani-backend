import { PrismaClient, ClientRemedy, RemedyType, RemedyStatus } from '../generated/prisma';

const prisma = new PrismaClient();

export class RemedyRepository {
    /**
     * Find remedies for a client
     */
    async findByClientId(tenantId: string, clientId: string) {
        return prisma.clientRemedy.findMany({
            where: { tenantId, clientId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Find remedies for a specific consultation
     */
    async findByConsultationId(tenantId: string, consultationId: string) {
        return prisma.clientRemedy.findMany({
            where: { tenantId, consultationId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Create a remedy
     */
    async create(tenantId: string, data: {
        clientId: string;
        consultationId?: string;
        remedyType: RemedyType;
        remedyTitle: string;
        remedyDescription?: string;
        instructions?: string;
        startDate?: Date;
        endDate?: Date;
        status?: RemedyStatus;
        createdBy?: string;
    }) {
        return prisma.clientRemedy.create({
            data: {
                ...data,
                tenantId
            }
        });
    }

    /**
     * Update remedy status or notes
     */
    async update(tenantId: string, id: string, data: any) {
        return prisma.clientRemedy.update({
            where: { id, tenantId },
            data
        });
    }
}

export const remedyRepository = new RemedyRepository();

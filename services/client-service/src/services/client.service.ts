import { PrismaClient, Client } from '@prisma/client';

const prisma = new PrismaClient();

export const ClientService = {
    async getAllClients(tenantId: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const [clients, total] = await prisma.$transaction([
            prisma.client.findMany({
                where: { tenantId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.client.count({ where: { tenantId } }),
        ]);
        return { clients, total, page, limit };
    },

    async getClientById(tenantId: string, id: string): Promise<Client | null> {
        return prisma.client.findUnique({
            where: { id },
            include: {
                familyLinksFrom: true,
                familyLinksTo: true,
            },
        });
    },

    async createClient(tenantId: string, data: any): Promise<Client> {
        // In a real scenario, we would generate clientCode logic here
        const clientCode = `CL-${Date.now()}`;
        return prisma.client.create({
            data: {
                ...data,
                tenantId,
                clientCode,
            },
        });
    },

    async updateClient(tenantId: string, id: string, data: any): Promise<Client> {
        return prisma.client.update({
            where: { id }, // In real app, verify tenantId access
            data,
        });
    },

    async deleteClient(tenantId: string, id: string): Promise<Client> {
        return prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    },
};

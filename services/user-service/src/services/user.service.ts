import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export const UserService = {
    async getAllUsers(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count(),
        ]);
        return { users, total, page, limit };
    },

    async getUserById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id },
            include: {
                preferences: true,
                addresses: true,
            },
        });
    },

    async createUser(data: any): Promise<User> {
        // Basic creation logic - typically auth service handles signup
        // This might be used by admin or for testing
        return prisma.user.create({
            data,
        });
    },

    async updateUser(id: string, data: any): Promise<User> {
        return prisma.user.update({
            where: { id },
            data,
        });
    },

    async deleteUser(id: string): Promise<User> {
        // Soft delete usually preferred
        return prisma.user.update({
            where: { id },
            data: { status: 'deleted', deletedAt: new Date() },
        });
    },
};

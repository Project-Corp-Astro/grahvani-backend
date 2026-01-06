import { PrismaClient, User } from '../generated/prisma';

const prisma = new PrismaClient();

export class UserRepository {
    /**
     * Find many users with pagination and filters
     */
    async findMany(options: {
        where?: Record<string, any>;
        orderBy?: Record<string, 'asc' | 'desc'>;
        skip?: number;
        take?: number;
    }) {
        return prisma.user.findMany({
            where: options.where,
            orderBy: options.orderBy,
            skip: options.skip,
            take: options.take,
        });
    }

    /**
     * Count users matching criteria
     */
    async count(options: { where?: Record<string, any> }) {
        return prisma.user.count({ where: options.where });
    }

    /**
     * Find user by ID within tenant
     */
    async findById(tenantId: string, id: string): Promise<User | null> {
        console.log('[UserRepository.findById] Querying:', { id, tenantId });
        const user = await prisma.user.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                preferences: true,
                addresses: true,
            },
        });
        console.log('[UserRepository.findById] Result:', user ? { id: user.id, email: user.email, tenantId: user.tenantId } : 'NOT FOUND');
        return user;
    }

    /**
     * Find user by email within tenant
     */
    async findByEmail(tenantId: string, email: string): Promise<User | null> {
        return prisma.user.findFirst({
            where: { email, tenantId, deletedAt: null },
        });
    }

    /**
     * Find user by display name (global uniqueness check)
     */
    async findByDisplayName(displayName: string): Promise<User | null> {
        return prisma.user.findFirst({
            where: { displayName, deletedAt: null },
        });
    }

    /**
     * Create new user
     */
    async create(data: Partial<User> & { tenantId: string; email: string; name: string }): Promise<User> {
        return prisma.user.create({
            data: data as any,
        });
    }

    /**
     * Update user by ID within tenant
     */
    async update(tenantId: string, id: string, data: Record<string, any>): Promise<User> {
        return prisma.user.update({
            where: { id },
            data,
        });
    }

    /**
     * Soft delete user
     */
    async softDelete(tenantId: string, id: string): Promise<User> {
        return prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'deleted',
                email: `deleted_${id}@deleted.local`,
                name: 'Deleted User',
                displayName: null,
                avatarUrl: null,
                bio: null,
            },
        });
    }

    /**
     * Create activity log
     */
    async createActivityLog(data: {
        userId: string;
        action: string;
        entityType?: string;
        entityId?: string;
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        ipAddress?: string;
        userAgent?: string;
    }) {
        return prisma.userActivityLog.create({
            data: data as any,
        });
    }

    /**
     * Get user activity logs
     */
    async getActivityLogs(userId: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        return prisma.userActivityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });
    }
}

// Singleton instance
export const userRepository = new UserRepository();

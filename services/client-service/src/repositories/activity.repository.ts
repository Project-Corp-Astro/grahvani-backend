import { getPrismaClient } from '../config/database';

export interface CreateActivityLogData {
    tenantId: string;
    clientId?: string;
    userId?: string;
    action: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    deviceName?: string;
}

export class ActivityRepository {
    private prisma = getPrismaClient();

    /**
     * Create a new activity log entry
     */
    async create(data: CreateActivityLogData) {
        return this.prisma.clientActivityLog.create({
            data: {
                tenantId: data.tenantId,
                clientId: data.clientId,
                userId: data.userId,
                action: data.action,
                details: data.details || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                deviceType: data.deviceType,
                deviceName: data.deviceName,
            },
        });
    }

    /**
     * Get activity logs for a specific client
     */
    async findByClientId(tenantId: string, clientId: string, limit = 50) {
        return this.prisma.clientActivityLog.findMany({
            where: { tenantId, clientId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }
}

export const activityRepository = new ActivityRepository();

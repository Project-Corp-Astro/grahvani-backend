// Session Service - Complete Implementation per LLD
import { getRedisClient } from '../config/redis';
import { TokenService } from './token.service';
import { PrismaClient, Session } from '../generated/prisma';
import { logger } from '../config/logger';

export interface SessionInfo {
    id: string;
    deviceType: string | null;
    deviceName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    lastActivityAt: Date;
    createdAt: Date;
    isCurrent: boolean;
    isActive: boolean;
}

export interface CreateSessionData {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    deviceName?: string;
    rememberMe?: boolean;
}

export class SessionService {
    private prisma = new PrismaClient();
    private redis = getRedisClient();
    private tokenService = new TokenService();

    /**
     * Create a new session
     */
    async createSession(data: CreateSessionData): Promise<{ session: SessionInfo; sessionId: string }> {
        const expiresAt = data.rememberMe
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days

        // Detect device type from user agent
        const deviceType = this.detectDeviceType(data.userAgent || '');

        const session = await this.prisma.session.create({
            data: {
                userId: data.userId,
                tokenHash: '', // Will be updated when tokens are generated
                refreshTokenHash: '',
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                deviceType: deviceType || data.deviceType,
                deviceName: data.deviceName || this.generateDeviceName(data.userAgent || ''),
                expiresAt,
                lastActivityAt: new Date(),
            }
        });

        logger.info({ userId: data.userId, sessionId: session.id }, 'Session created');

        return {
            session: {
                id: session.id,
                deviceType: session.deviceType,
                deviceName: session.deviceName,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                lastActivityAt: session.lastActivityAt,
                createdAt: session.createdAt,
                isCurrent: true,
                isActive: session.isActive,
            },
            sessionId: session.id,
        };
    }

    /**
     * Get all active sessions for a user
     */
    async getUserSessions(userId: string, currentSessionId?: string): Promise<{
        sessions: SessionInfo[];
        total: number;
    }> {
        const sessions = await this.prisma.session.findMany({
            where: {
                userId,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            orderBy: { lastActivityAt: 'desc' },
        });

        return {
            sessions: sessions.map(s => ({
                id: s.id,
                deviceType: s.deviceType,
                deviceName: s.deviceName,
                ipAddress: s.ipAddress,
                userAgent: s.userAgent,
                lastActivityAt: s.lastActivityAt,
                createdAt: s.createdAt,
                isCurrent: s.id === currentSessionId,
                isActive: s.isActive,
            })),
            total: sessions.length,
        };
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string): Promise<SessionInfo | null> {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session) return null;

        return {
            id: session.id,
            deviceType: session.deviceType,
            deviceName: session.deviceName,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            lastActivityAt: session.lastActivityAt,
            createdAt: session.createdAt,
            isCurrent: false,
            isActive: session.isActive,
        };
    }

    /**
     * Update session activity timestamp
     */
    async updateActivity(sessionId: string): Promise<void> {
        await this.prisma.session.update({
            where: { id: sessionId },
            data: { lastActivityAt: new Date() },
        });
    }

    /**
     * Revoke a single session
     */
    async revokeSession(sessionId: string, userId: string): Promise<void> {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.userId !== userId) {
            throw new Error('Session not found or access denied');
        }

        await this.prisma.session.update({
            where: { id: sessionId },
            data: { isActive: false },
        });

        // Remove token family from Redis
        await this.redis.del(`token_family:${sessionId}`);

        logger.info({ userId, sessionId }, 'Session revoked');
    }

    /**
     * Revoke all sessions except current
     */
    async revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
        const result = await this.prisma.session.updateMany({
            where: {
                userId,
                isActive: true,
                id: { not: currentSessionId },
            },
            data: { isActive: false },
        });

        // Get all session IDs to remove from Redis
        const sessions = await this.prisma.session.findMany({
            where: { userId, id: { not: currentSessionId } },
            select: { id: true },
        });

        for (const session of sessions) {
            await this.redis.del(`token_family:${session.id}`);
        }

        logger.info({ userId, revokedCount: result.count }, 'Other sessions revoked');

        return result.count;
    }

    /**
     * Revoke all sessions for a user (force logout)
     */
    async revokeAllSessions(userId: string): Promise<number> {
        const result = await this.prisma.session.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
        });

        // Increment token version (invalidates all tokens)
        await this.tokenService.invalidateAllUserTokens(userId);

        logger.info({ userId, revokedCount: result.count }, 'All sessions revoked');

        return result.count;
    }

    /**
     * Cleanup expired sessions (scheduled job)
     */
    async cleanupExpiredSessions(): Promise<number> {
        const result = await this.prisma.session.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { isActive: false, lastActivityAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                ],
            },
        });

        logger.info({ deletedCount: result.count }, 'Expired sessions cleaned up');

        return result.count;
    }

    /**
     * Check if session is valid
     */
    async isSessionValid(sessionId: string): Promise<boolean> {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!session) return false;
        if (!session.isActive) return false;
        if (session.expiresAt < new Date()) return false;

        return true;
    }

    // ============ PRIVATE METHODS ============

    private detectDeviceType(userAgent: string): string {
        if (/mobile/i.test(userAgent)) return 'mobile';
        if (/tablet/i.test(userAgent)) return 'tablet';
        if (/iPad/i.test(userAgent)) return 'tablet';
        if (/iPhone/i.test(userAgent)) return 'mobile';
        if (/Android/i.test(userAgent) && !/mobile/i.test(userAgent)) return 'tablet';
        return 'desktop';
    }

    private generateDeviceName(userAgent: string): string {
        // Extract browser and OS from user agent
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';

        if (/Chrome/i.test(userAgent)) browser = 'Chrome';
        else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
        else if (/Safari/i.test(userAgent)) browser = 'Safari';
        else if (/Edge/i.test(userAgent)) browser = 'Edge';

        if (/Windows/i.test(userAgent)) os = 'Windows';
        else if (/Mac/i.test(userAgent)) os = 'Mac';
        else if (/Linux/i.test(userAgent)) os = 'Linux';
        else if (/Android/i.test(userAgent)) os = 'Android';
        else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';

        return `${browser} on ${os}`;
    }
}

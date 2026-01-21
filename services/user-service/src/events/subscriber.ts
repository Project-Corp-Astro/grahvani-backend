import { RedisClientType } from 'redis';
import { getRedisClient } from '../config/redis';
import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

export interface UserRegisteredEvent {
    type: 'user.registered';
    data: {
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        avatarUrl?: string;
        role: string;
        metadata?: {
            ipAddress?: string;
            userAgent?: string;
            deviceType?: string;
            deviceName?: string;
        };
    };
    timestamp: string;
}

// ... (rest of interfaces remain same)

export interface UserUpdatedEvent {
    type: 'user.updated';
    data: {
        userId: string;
        tenantId: string;
        changedFields?: string[];
        email?: string;
        name?: string;
        avatarUrl?: string;
    };
    timestamp: string;
}

export interface UserDeletedEvent {
    type: 'user.deleted';
    data: {
        userId: string;
        tenantId: string;
    };
    timestamp: string;
}

export interface UserLoginEvent {
    type: 'user.login';
    data: {
        userId: string;
        sessionId: string;
        metadata: {
            ipAddress?: string;
            deviceType?: string;
            deviceName?: string;
            userAgent?: string;
        };
    };
    timestamp: string;
}

export interface UserLogoutEvent {
    type: 'user.logout';
    data: {
        userId: string;
        sessionId: string;
        metadata?: {
            allDevices?: boolean;
            ipAddress?: string;
            deviceType?: string;
            deviceName?: string;
            userAgent?: string;
        };
    };
    timestamp: string;
}

export interface AuthSessionRevokedEvent {
    type: 'auth.session_revoked';
    data: {
        userId: string;
        sessionId: string;
        metadata?: {
            ipAddress?: string;
            userAgent?: string;
            deviceType?: string;
            deviceName?: string;
        };
    };
    timestamp: string;
}

export interface AuthPasswordResetEvent {
    type: 'auth.password_reset';
    data: {
        userId: string;
        metadata: {
            ipAddress?: string;
            userAgent?: string;
            deviceType?: string;
            deviceName?: string;
        };
    };
    timestamp: string;
}

export interface AuthPasswordChangedEvent {
    type: 'auth.password_changed';
    data: {
        userId: string;
        metadata: {
            ipAddress?: string;
            userAgent?: string;
            deviceType?: string;
            deviceName?: string;
        };
    };
    timestamp: string;
}

type AuthEvent =
    | UserRegisteredEvent
    | UserUpdatedEvent
    | UserDeletedEvent
    | UserLoginEvent
    | UserLogoutEvent
    | AuthSessionRevokedEvent
    | AuthPasswordResetEvent
    | AuthPasswordChangedEvent;

export class EventSubscriber {
    private isRunning = false;

    private async getClient(): Promise<RedisClientType> {
        return getRedisClient();
    }

    /**
     * Start listening for Auth Service events
     */
    async start(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[EventSubscriber] Starting event listener...');

        const subscriber = await this.getClient();
        const duplicate = subscriber.duplicate();
        await duplicate.connect();

        // Subscribe to the main Auth Service channel
        // Auth Service publishes all events to: grahvani:events:auth
        await duplicate.subscribe('grahvani:events:auth', (message) => {
            this.handleAuthEvent(message);
        });

        // Also subscribe to User-specific channel if Auth Service uses publishToService
        await duplicate.subscribe('grahvani:events:user', (message) => {
            this.handleAuthEvent(message);
        });

        console.log('[EventSubscriber] Subscribed to grahvani:events:auth and grahvani:events:user');
    }

    /**
     * Handle incoming Auth Service events
     */
    private async handleAuthEvent(message: string): Promise<void> {
        try {
            const event: AuthEvent = JSON.parse(message);

            switch (event.type) {
                case 'user.registered':
                    await this.handleUserRegistered(event);
                    break;
                case 'user.updated':
                    await this.handleUserUpdated(event);
                    break;
                case 'user.deleted':
                    await this.handleUserDeleted(event);
                    break;
                case 'user.login':
                    await this.handleUserLogin(event);
                    break;
                case 'user.logout':
                    await this.handleUserLogout(event);
                    break;
                case 'auth.session_revoked':
                    await this.handleAuthSessionRevoked(event);
                    break;
                case 'auth.password_reset':
                    await this.handlePasswordReset(event);
                    break;
                case 'auth.password_changed':
                    await this.handlePasswordChanged(event);
                    break;
                default:
                    console.warn(`[EventSubscriber] Unknown event type: ${(event as any).type}`);
            }
        } catch (error) {
            console.error('[EventSubscriber] Failed to process event:', error);
        }
    }

    /**
     * Handle user.registered - Create user profile in User Service
     */
    private async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
        const { userId, tenantId, email, name, avatarUrl, role } = event.data;

        try {
            // Upsert to handle idempotency (same event received twice)
            await prisma.user.upsert({
                where: { id: userId },
                create: {
                    id: userId,
                    tenantId,
                    email,
                    name,
                    avatarUrl: avatarUrl || null,
                    role: role as any || 'user',
                    status: 'pending_verification',
                    emailVerified: false,
                    isPublic: true,
                    isVerified: false,
                    followersCount: 0,
                    followingCount: 0,
                },
                update: {
                    // Only update if explicitly provided
                    ...(name && { name }),
                    ...(avatarUrl && { avatarUrl }),
                },
            });

            console.log(`[EventSubscriber] User profile created/updated: ${userId}`);

            // Log registration activity
            if (event.data.metadata) {
                await prisma.userActivityLog.create({
                    data: {
                        userId,
                        action: 'user_registered',
                        ipAddress: event.data.metadata.ipAddress || null,
                        userAgent: event.data.metadata.userAgent || null,
                        deviceType: event.data.metadata.deviceType || null,
                        deviceName: event.data.metadata.deviceName || null,
                    },
                });
            }
        } catch (error) {
            console.error(`[EventSubscriber] Failed to create user profile:`, error);
            throw error;
        }
    }

    /**
     * Handle user.updated - Sync profile changes
     */
    private async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
        const { userId, email, name, avatarUrl } = event.data;

        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    ...(email && { email }),
                    ...(name && { name }),
                    ...(avatarUrl !== undefined && { avatarUrl }),
                },
            });

            console.log(`[EventSubscriber] User profile synced: ${userId}`);
        } catch (error) {
            // User might not exist if event came before registration
            console.warn(`[EventSubscriber] User not found for update: ${userId}`);
        }
    }

    /**
     * Handle user.deleted - Soft delete in User Service
     */
    private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
        const { userId } = event.data;

        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    status: 'deleted',
                    deletedAt: new Date(),
                    email: `deleted_${userId}@deleted.local`,
                    name: 'Deleted User',
                    displayName: null,
                    avatarUrl: null,
                    bio: null,
                },
            });

            console.log(`[EventSubscriber] User soft deleted: ${userId}`);
        } catch (error) {
            console.warn(`[EventSubscriber] User not found for deletion: ${userId}`);
        }
    }

    /**
     * Handle user.login - Log activity in User Service
     */
    private async handleUserLogin(event: UserLoginEvent): Promise<void> {
        const { userId, metadata } = event.data;

        try {
            await prisma.userActivityLog.create({
                data: {
                    userId,
                    action: 'user_login',
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    deviceType: metadata.deviceType || null,
                    deviceName: metadata.deviceName || null,
                },
            });

            console.log(`[EventSubscriber] Login activity logged for user: ${userId}`);
        } catch (error) {
            console.error(`[EventSubscriber] Failed to log login activity:`, error);
        }
    }

    /**
     * Handle user.logout - Log activity in User Service
     */
    private async handleUserLogout(event: UserLogoutEvent): Promise<void> {
        const { userId, sessionId, metadata } = event.data;

        try {
            await prisma.userActivityLog.create({
                data: {
                    userId,
                    action: metadata?.allDevices ? 'user_logout_all' : 'user_logout',
                    entityType: 'session',
                    entityId: sessionId,
                    ipAddress: metadata?.ipAddress || null,
                    userAgent: metadata?.userAgent || null,
                    deviceType: metadata?.deviceType || null,
                    deviceName: metadata?.deviceName || null,
                },
            });

            console.log(`[EventSubscriber] Logout activity logged for user: ${userId}`);
        } catch (error) {
            console.error(`[EventSubscriber] Failed to log logout activity:`, error);
        }
    }

    /**
     * Handle auth.session_revoked - Log activity in User Service
     */
    private async handleAuthSessionRevoked(event: AuthSessionRevokedEvent): Promise<void> {
        const { userId, sessionId, metadata } = event.data;

        try {
            await prisma.userActivityLog.create({
                data: {
                    userId,
                    action: 'session_revoked',
                    entityType: 'session',
                    entityId: sessionId,
                    ipAddress: metadata?.ipAddress || null,
                    userAgent: metadata?.userAgent || null,
                    deviceType: metadata?.deviceType || null,
                    deviceName: metadata?.deviceName || null,
                },
            });

            console.log(`[EventSubscriber] Session revocation logged for user: ${userId}`);
        } catch (error) {
            console.error(`[EventSubscriber] Failed to log session revocation:`, error);
        }
    }

    /**
     * Handle auth.password_reset - Log activity
     */
    private async handlePasswordReset(event: AuthPasswordResetEvent): Promise<void> {
        const { userId, metadata } = event.data;

        try {
            await prisma.userActivityLog.create({
                data: {
                    userId,
                    action: 'password_reset',
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    deviceType: metadata.deviceType || null,
                    deviceName: metadata.deviceName || null,
                },
            });

            console.log(`[EventSubscriber] Password reset logged for user: ${userId}`);
        } catch (error) {
            console.error(`[EventSubscriber] Failed to log password reset:`, error);
        }
    }

    /**
     * Handle auth.password_changed - Log activity
     */
    private async handlePasswordChanged(event: AuthPasswordChangedEvent): Promise<void> {
        const { userId, metadata } = event.data;

        try {
            await prisma.userActivityLog.create({
                data: {
                    userId,
                    action: 'password_changed',
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    deviceType: metadata.deviceType || null,
                    deviceName: metadata.deviceName || null,
                },
            });

            console.log(`[EventSubscriber] Password change logged for user: ${userId}`);
        } catch (error) {
            console.error(`[EventSubscriber] Failed to log password change:`, error);
        }
    }

    /**
     * Stop the subscriber
     */
    async stop(): Promise<void> {
        this.isRunning = false;
        console.log('[EventSubscriber] Stopped');
    }
}

// Singleton instance
export const eventSubscriber = new EventSubscriber();

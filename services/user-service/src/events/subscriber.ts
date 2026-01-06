// Event Subscriber for User Service
// Listens to Auth Service events and syncs user data
import { createClient, RedisClientType } from 'redis';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export interface UserRegisteredEvent {
    type: 'user.registered';
    payload: {
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        avatarUrl?: string;
        role: string;
    };
    timestamp: string;
}

export interface UserUpdatedEvent {
    type: 'user.updated';
    payload: {
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
    payload: {
        userId: string;
        tenantId: string;
    };
    timestamp: string;
}

type AuthEvent = UserRegisteredEvent | UserUpdatedEvent | UserDeletedEvent;

export class EventSubscriber {
    private redis: RedisClientType | null = null;
    private isRunning = false;

    private async getClient(): Promise<RedisClientType> {
        if (!this.redis) {
            const url = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = createClient({ url });
            await this.redis.connect();
        }
        return this.redis;
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
            console.log(`[EventSubscriber] Received ${event.type}:`, event.payload);

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
        const { userId, tenantId, email, name, avatarUrl, role } = event.payload;

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
        } catch (error) {
            console.error(`[EventSubscriber] Failed to create user profile:`, error);
            throw error;
        }
    }

    /**
     * Handle user.updated - Sync profile changes
     */
    private async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
        const { userId, email, name, avatarUrl } = event.payload;

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
        const { userId } = event.payload;

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
     * Stop the subscriber
     */
    async stop(): Promise<void> {
        if (this.redis) {
            await this.redis.disconnect();
            this.redis = null;
        }
        this.isRunning = false;
        console.log('[EventSubscriber] Stopped');
    }
}

// Singleton instance
export const eventSubscriber = new EventSubscriber();

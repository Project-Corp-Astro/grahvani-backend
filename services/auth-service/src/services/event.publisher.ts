// Event Publisher - For inter-service communication
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

// Event types published by Auth Service
export type AuthEventType =
    | 'user.registered'
    | 'user.login'
    | 'user.logout'
    | 'auth.password_reset_requested'
    | 'auth.password_reset'
    | 'auth.password_changed'
    | 'auth.email_verified'
    | 'auth.session_revoked';

export interface AuthEventPayload {
    userId?: string;
    email?: string;
    name?: string;
    token?: string;
    sessionId?: string;
    expiresAt?: string;
    isSocial?: boolean;
    metadata?: Record<string, unknown>;
}

export interface AuthEvent {
    type: AuthEventType;
    data: AuthEventPayload;
    metadata: {
        eventId: string;
        timestamp: string;
        source: 'auth-service';
        correlationId?: string;
    };
}

export class EventPublisher {
    private redis = getRedisClient();
    private readonly channel = 'grahvani:events:auth';

    /**
     * Publish an event to Redis Pub/Sub
     * Other services (Notification, User) subscribe to these events
     */
    async publish(type: AuthEventType, data: AuthEventPayload): Promise<void> {
        const event: AuthEvent = {
            type,
            data,
            metadata: {
                eventId: this.generateEventId(),
                timestamp: new Date().toISOString(),
                source: 'auth-service',
            },
        };

        try {
            await this.redis.publish(this.channel, JSON.stringify(event));
            logger.debug({ type, eventId: event.metadata.eventId }, 'Event published');
        } catch (error) {
            // Don't fail the main operation if event publishing fails
            logger.error({ error, type }, 'Failed to publish event');
        }
    }

    /**
     * Publish to specific service channel
     */
    async publishToService(
        service: 'notification' | 'user' | 'analytics',
        type: string,
        data: AuthEventPayload
    ): Promise<void> {
        const channel = `grahvani:events:${service}`;
        const event = {
            type,
            data,
            metadata: {
                eventId: this.generateEventId(),
                timestamp: new Date().toISOString(),
                source: 'auth-service',
            },
        };

        try {
            await this.redis.publish(channel, JSON.stringify(event));
            logger.debug({ type, channel }, 'Event published to service');
        } catch (error) {
            logger.error({ error, type, channel }, 'Failed to publish event');
        }
    }

    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

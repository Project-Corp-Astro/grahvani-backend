// Event Publisher for User Service
import { createClient, RedisClientType } from "redis";

export type UserEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.profile_updated"
  | "user.status_changed"
  | "user.role_changed";

export interface UserEventPayload {
  userId: string;
  tenantId?: string;
  changedFields?: string[];
  [key: string]: any;
}

export class EventPublisher {
  private redis: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.redis) {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      this.redis = createClient({ url });
      await this.redis.connect();
    }
    return this.redis;
  }

  async publish(
    eventType: UserEventType,
    payload: UserEventPayload,
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const channel = `user-service:${eventType}`;
      const message = JSON.stringify({
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      });

      await client.publish(channel, message);
      console.log(`[EventPublisher] Published ${eventType}:`, payload.userId);
    } catch (error) {
      console.error("[EventPublisher] Failed to publish event:", error);
      // Don't throw - events are non-critical
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
    }
  }
}

export const eventPublisher = new EventPublisher();

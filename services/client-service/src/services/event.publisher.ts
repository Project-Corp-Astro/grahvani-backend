import { getRedisClient } from "../config/redis";
import { logger } from "../config/logger";

export interface ClientEventPayload {
  clientId: string;
  tenantId: string;
  data?: any;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    deviceName?: string;
  };
}

export class EventPublisher {
  private redis = getRedisClient();
  private readonly CHANNEL = "grahvani:events:client";

  /**
   * Publish an event to the Redis bus
   */
  async publish(type: string, data: ClientEventPayload) {
    const event = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.redis.publish(this.CHANNEL, JSON.stringify(event));
      logger.debug({ type, clientId: data.clientId }, "Client event published");
    } catch (error) {
      logger.error({ error, type, clientId: data.clientId }, "Failed to publish client event");
    }
  }
}

export const eventPublisher = new EventPublisher();

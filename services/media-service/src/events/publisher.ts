import { getRedisClient } from "../config/redis";
import { logger } from "../config/logger";

const MEDIA_CHANNEL = "grahvani:events:media";

export interface MediaEvent {
  type: string;
  data: Record<string, unknown>;
  metadata: {
    eventId: string;
    timestamp: string;
    source: string;
    version: "1.0";
  };
}

/**
 * Publish media events via Redis Pub/Sub
 */
export async function publishMediaEvent(
  type: string,
  data: Record<string, unknown>,
) {
  try {
    const redis = getRedisClient();
    const event: MediaEvent = {
      type,
      data,
      metadata: {
        eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        source: "media-service",
        version: "1.0",
      },
    };

    await redis.publish(MEDIA_CHANNEL, JSON.stringify(event));
    logger.debug(
      { type, eventId: event.metadata.eventId },
      "Media event published",
    );
  } catch (err) {
    logger.error({ err, type }, "Failed to publish media event");
  }
}

/**
 * Convenience methods for common media events
 */
export const mediaEvents = {
  uploaded: (
    fileId: string,
    tenantId: string,
    bucket: string,
    mimeType: string,
    size: number,
  ) =>
    publishMediaEvent("media.uploaded", {
      fileId,
      tenantId,
      bucket,
      mimeType,
      size,
    }),

  processed: (fileId: string, variants: string[]) =>
    publishMediaEvent("media.processed", { fileId, variants }),

  deleted: (fileId: string, tenantId: string, storagePath: string) =>
    publishMediaEvent("media.deleted", { fileId, tenantId, storagePath }),
};

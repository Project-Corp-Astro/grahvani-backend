import { activityRepository, CreateActivityLogData } from "../repositories/activity.repository";
import { logger } from "../config/logger";

// Activity log write buffer for batching (reduces disk IO)
const activityBuffer: CreateActivityLogData[] = [];
const BUFFER_SIZE = 10; // Flush after 10 entries
const BUFFER_TIMEOUT_MS = 5000; // Or flush after 5 seconds
let flushTimer: NodeJS.Timeout | null = null;

export class ActivityService {
  /**
   * Record a client-related activity (batched for disk IO efficiency)
   */
  async recordActivity(data: CreateActivityLogData) {
    try {
      // Add to buffer instead of immediate write
      activityBuffer.push(data);
      logger.debug({ action: data.action, bufferSize: activityBuffer.length }, "Activity buffered");

      // Schedule flush if not already scheduled
      if (!flushTimer) {
        flushTimer = setTimeout(() => this.flushBuffer(), BUFFER_TIMEOUT_MS);
      }

      // Flush immediately if buffer is full
      if (activityBuffer.length >= BUFFER_SIZE) {
        await this.flushBuffer();
      }

      return { buffered: true };
    } catch (error) {
      logger.error({ error, data }, "Failed to buffer client activity");
      return null;
    }
  }

  /**
   * Record activity immediately (for critical actions)
   */
  async recordActivityImmediate(data: CreateActivityLogData) {
    try {
      const log = await activityRepository.create(data);
      logger.debug(
        { activityId: log.id, action: data.action },
        "Client activity recorded immediately",
      );
      return log;
    } catch (error) {
      logger.error({ error, data }, "Failed to record client activity");
      return null;
    }
  }

  /**
   * Flush the activity buffer to database
   */
  async flushBuffer() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (activityBuffer.length === 0) return;

    const toFlush = [...activityBuffer];
    activityBuffer.length = 0; // Clear buffer immediately to prevent double-flushing

    try {
      // 1. Try batch insert (efficient)
      await activityRepository.createMany(toFlush);
      logger.info({ count: toFlush.length }, "Activity buffer flushed to database");
    } catch (error: any) {
      // 2. Fallback: If batch fails, try individual inserts to isolate "poison pills"
      // This prevents one bad record (e.g. deleted clientId) from blocking ALL logs
      logger.warn(
        { error: error.message, count: toFlush.length },
        "Batch activity flush failed - falling back to individual inserts",
      );

      for (const data of toFlush) {
        try {
          await activityRepository.create(data);
        } catch (individualError: any) {
          // Handle Foreign Key Constraint Violation (P2003)
          // This usually happens if the clientId was deleted while the log was in buffer
          if (individualError.code === "P2003") {
            logger.error(
              {
                action: data.action,
                clientId: data.clientId,
                error: "Foreign key constraint failed (P2003)",
              },
              "Dropping invalid activity log (Poison Pill detected)",
            );
          } else {
            logger.error(
              { action: data.action, error: individualError.message },
              "Failed to save individual activity log",
            );
            // Optionally re-buffer non-P2003 errors, but for simplicity we drop them to avoid loops
            // A senior dev approach: logs are "best effort" and shouldn't crash the service
          }
        }
      }
    }
  }

  /**
   * Get recent activity for a client
   */
  async getClientHistory(tenantId: string, clientId: string) {
    return activityRepository.findByClientId(tenantId, clientId);
  }

  /**
   * Get buffer status (for monitoring)
   */
  getBufferStatus() {
    return {
      bufferedCount: activityBuffer.length,
      hasTimer: !!flushTimer,
    };
  }
}

export const activityService = new ActivityService();

// Flush buffer on process exit
process.on("beforeExit", async () => {
  await activityService.flushBuffer();
});

process.on("SIGINT", async () => {
  await activityService.flushBuffer();
});

process.on("SIGTERM", async () => {
  await activityService.flushBuffer();
});

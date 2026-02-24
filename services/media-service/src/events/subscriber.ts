import Redis from "ioredis";
import { logger } from "../config/logger";

let subscriber: Redis | null = null;

/**
 * Event subscriber for Media Service.
 * Listens for events from other services (e.g., user.deleted → cleanup files).
 */
export const eventSubscriber = {
    async start() {
        const url = process.env.REDIS_URL || "redis://localhost:6379";
        subscriber = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                return Math.min(times * 200, 2000);
            },
        });

        // Listen for auth events (user deletion → cleanup media)
        await subscriber.subscribe("grahvani:events:auth");
        logger.info("Subscribed to auth events");

        subscriber.on("message", async (channel: string, message: string) => {
            try {
                const event = JSON.parse(message);

                // Handle user deletion: queue cleanup of user's files
                if (event.type === "user.deleted" && event.data?.userId) {
                    logger.info(
                        { userId: event.data.userId },
                        "User deleted — files will be cleaned up by scheduled job",
                    );
                    // Future: Queue a bulk cleanup job
                }
            } catch (err) {
                logger.error({ err, channel }, "Failed to process event");
            }
        });

        subscriber.on("error", (err) => {
            logger.error({ err }, "Event subscriber error");
        });
    },

    async stop() {
        if (subscriber) {
            await subscriber.unsubscribe();
            await subscriber.quit();
            subscriber = null;
            logger.info("Event subscriber stopped");
        }
    },
};

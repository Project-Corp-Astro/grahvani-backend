import Redis from "ioredis";
import { EVENT_CHANNELS } from "@grahvani/contracts";
import { logger } from "../config/logger";
import { getSlackConfig } from "../config/slack";
import { postMessage, postAlert } from "../services/slack.service";
import { formatEvent } from "../services/formatter.service";

let subscriber: Redis | null = null;

// All channels to subscribe to
const CHANNELS = [
  EVENT_CHANNELS.AUTH,
  EVENT_CHANNELS.CLIENT,
  EVENT_CHANNELS.BOOKING,
  EVENT_CHANNELS.PAYMENT,
  EVENT_CHANNELS.NOTIFICATION,
  EVENT_CHANNELS.REPORT,
  EVENT_CHANNELS.MEDIA,
];

/**
 * Event subscriber that listens to ALL Grahvani event channels
 * and forwards formatted messages to Slack.
 */
export const eventSubscriber = {
  async start(): Promise<void> {
    const config = getSlackConfig();

    if (!config.enabled) {
      logger.warn("Slack disabled — event subscriber will not start");
      return;
    }

    const url = process.env.REDIS_URL || "redis://localhost:6379";
    subscriber = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 2000);
      },
    });

    // Subscribe to all event channels
    await subscriber.subscribe(...CHANNELS);
    logger.info({ channels: CHANNELS.length }, "Subscribed to all event channels");

    subscriber.on("message", async (channel: string, message: string) => {
      try {
        const event = JSON.parse(message);

        if (!event.type || !event.data || !event.metadata) {
          logger.warn({ channel, message: message.slice(0, 200) }, "Malformed event received");
          return;
        }

        logger.debug({ type: event.type, channel }, "Processing event");

        const slackMessage = formatEvent(channel, event);
        await postMessage(slackMessage);
      } catch (err) {
        logger.error({ err, channel }, "Failed to process event for Slack");
      }
    });

    subscriber.on("error", (err) => {
      logger.error({ err }, "Event subscriber Redis error");
    });

    subscriber.on("reconnecting", () => {
      logger.info("Event subscriber reconnecting to Redis");
    });

    // Send startup notification
    await postAlert(
      ":rocket: *Slack Service Started*\nListening to all Grahvani event channels.",
    );
  },

  async stop(): Promise<void> {
    if (subscriber) {
      await subscriber.unsubscribe();
      await subscriber.quit();
      subscriber = null;
      logger.info("Event subscriber stopped");
    }
  },
};

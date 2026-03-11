import { logger } from "./logger";

export interface SlackConfig {
  botToken: string;
  enabled: boolean;
  defaultChannel: string;
  channels: {
    auth: string;
    clients: string;
    payments: string;
    bookings: string;
    media: string;
    reports: string;
    alerts: string;
  };
}

export function getSlackConfig(): SlackConfig {
  const botToken = process.env.SLACK_BOT_TOKEN || "";
  const enabled = process.env.SLACK_ENABLED === "true" && !!botToken;
  const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL || "general";

  if (!botToken) {
    logger.warn("SLACK_BOT_TOKEN not set — Slack notifications disabled");
  }

  return {
    botToken,
    enabled,
    defaultChannel,
    channels: {
      auth: process.env.SLACK_CHANNEL_AUTH || defaultChannel,
      clients: process.env.SLACK_CHANNEL_CLIENTS || defaultChannel,
      payments: process.env.SLACK_CHANNEL_PAYMENTS || defaultChannel,
      bookings: process.env.SLACK_CHANNEL_BOOKINGS || defaultChannel,
      media: process.env.SLACK_CHANNEL_MEDIA || defaultChannel,
      reports: process.env.SLACK_CHANNEL_REPORTS || defaultChannel,
      alerts: process.env.SLACK_CHANNEL_ALERTS || defaultChannel,
    },
  };
}

/**
 * Map an event channel name to the appropriate Slack channel.
 */
export function getChannelForEvent(eventChannel: string): string {
  const config = getSlackConfig();

  const mapping: Record<string, string> = {
    "grahvani:events:auth": config.channels.auth,
    "grahvani:events:client": config.channels.clients,
    "grahvani:events:payment": config.channels.payments,
    "grahvani:events:booking": config.channels.bookings,
    "grahvani:events:media": config.channels.media,
    "grahvani:events:report": config.channels.reports,
    "grahvani:events:notification": config.defaultChannel,
  };

  return mapping[eventChannel] || config.defaultChannel;
}

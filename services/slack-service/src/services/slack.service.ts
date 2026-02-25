import { WebClient, ChatPostMessageResponse } from "@slack/web-api";
import { logger } from "../config/logger";
import { getSlackConfig } from "../config/slack";

let client: WebClient | null = null;

function getClient(): WebClient {
  if (!client) {
    const config = getSlackConfig();
    client = new WebClient(config.botToken);
  }
  return client;
}

export interface SlackMessage {
  channel: string;
  text: string; // Fallback for notifications
  blocks: SlackBlock[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: Record<string, unknown>[];
  block_id?: string;
}

/**
 * Post a message to Slack. Handles retries and graceful degradation.
 */
export async function postMessage(message: SlackMessage): Promise<boolean> {
  const config = getSlackConfig();

  if (!config.enabled) {
    logger.debug({ channel: message.channel }, "Slack disabled, skipping message");
    return false;
  }

  try {
    const result: ChatPostMessageResponse = await getClient().chat.postMessage({
      channel: message.channel,
      text: message.text,
      blocks: message.blocks,
      unfurl_links: false,
      unfurl_media: false,
    });

    if (result.ok) {
      logger.debug({ channel: message.channel, ts: result.ts }, "Slack message sent");
      return true;
    }

    logger.error({ error: result.error, channel: message.channel }, "Slack API returned error");
    return false;
  } catch (error: unknown) {
    const err = error as Error & { code?: string; data?: { error?: string } };

    // Rate limited — log but don't crash
    if (err.code === "slack_webapi_platform_error" && err.data?.error === "ratelimited") {
      logger.warn({ channel: message.channel }, "Slack rate limited, message dropped");
      return false;
    }

    // Channel not found — likely misconfigured env var
    if (err.data?.error === "channel_not_found") {
      logger.error(
        { channel: message.channel },
        "Slack channel not found — check SLACK_CHANNEL_* env vars",
      );
      return false;
    }

    // Token invalid
    if (err.data?.error === "invalid_auth" || err.data?.error === "not_authed") {
      logger.error("Slack bot token is invalid — check SLACK_BOT_TOKEN");
      return false;
    }

    logger.error({ err, channel: message.channel }, "Failed to send Slack message");
    return false;
  }
}

/**
 * Post an alert-level message (errors, failures) to the alerts channel.
 */
export async function postAlert(text: string, details?: string): Promise<boolean> {
  const config = getSlackConfig();
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Alert — Grahvani Platform", emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: text },
    },
  ];

  if (details) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `\`\`\`${details}\`\`\`` },
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `_${new Date().toISOString()}_` }],
  });

  return postMessage({
    channel: config.channels.alerts,
    text: `Alert: ${text}`,
    blocks,
  });
}

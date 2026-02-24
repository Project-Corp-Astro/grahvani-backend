import { SlackMessage, SlackBlock } from "./slack.service";
import { getChannelForEvent } from "../config/slack";

interface EventPayload {
  type: string;
  data: Record<string, unknown>;
  metadata: {
    eventId: string;
    timestamp: string;
    source: string;
    correlationId?: string;
    version: string;
  };
}

/**
 * Format a Grahvani event into a rich Slack Block Kit message.
 */
export function formatEvent(channel: string, event: EventPayload): SlackMessage {
  const slackChannel = getChannelForEvent(channel);
  const formatter = EVENT_FORMATTERS[event.type];

  if (formatter) {
    return formatter(slackChannel, event);
  }

  // Fallback for unknown event types
  return formatGenericEvent(slackChannel, event);
}

// ─────────────────────────────────────────────────────────────────────
// AUTH EVENTS
// ─────────────────────────────────────────────────────────────────────

function formatUserRegistered(channel: string, event: EventPayload): SlackMessage {
  const { name, email, isSocial } = event.data as {
    name: string;
    email: string;
    isSocial?: boolean;
  };

  return buildMessage(channel, {
    emoji: ":tada:",
    title: "New User Registered",
    color: "#36a64f",
    fields: [
      { label: "Name", value: name },
      { label: "Email", value: email },
      ...(isSocial ? [{ label: "Method", value: "Social Login" }] : []),
    ],
    metadata: event.metadata,
  });
}

function formatUserLogin(channel: string, event: EventPayload): SlackMessage {
  const { userId, deviceType, ipAddress } = event.data as {
    userId: string;
    deviceType?: string;
    ipAddress?: string;
  };

  return buildMessage(channel, {
    emoji: ":key:",
    title: "User Login",
    fields: [
      { label: "User", value: userId },
      ...(deviceType ? [{ label: "Device", value: deviceType }] : []),
      ...(ipAddress ? [{ label: "IP", value: ipAddress }] : []),
    ],
    metadata: event.metadata,
  });
}

function formatUserLogout(channel: string, event: EventPayload): SlackMessage {
  const { userId, allDevices } = event.data as { userId: string; allDevices: boolean };

  return buildMessage(channel, {
    emoji: ":door:",
    title: "User Logout",
    fields: [
      { label: "User", value: userId },
      { label: "All Devices", value: allDevices ? "Yes" : "No" },
    ],
    metadata: event.metadata,
  });
}

function formatPasswordResetRequested(channel: string, event: EventPayload): SlackMessage {
  const { email, name } = event.data as { email: string; name: string };

  return buildMessage(channel, {
    emoji: ":lock:",
    title: "Password Reset Requested",
    fields: [
      { label: "Name", value: name },
      { label: "Email", value: email },
    ],
    metadata: event.metadata,
  });
}

function formatPasswordChanged(channel: string, event: EventPayload): SlackMessage {
  const { userId } = event.data as { userId: string };

  return buildMessage(channel, {
    emoji: ":closed_lock_with_key:",
    title: "Password Changed",
    fields: [{ label: "User", value: userId }],
    metadata: event.metadata,
  });
}

function formatEmailVerified(channel: string, event: EventPayload): SlackMessage {
  const { email } = event.data as { email: string };

  return buildMessage(channel, {
    emoji: ":white_check_mark:",
    title: "Email Verified",
    fields: [{ label: "Email", value: email }],
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// CLIENT EVENTS
// ─────────────────────────────────────────────────────────────────────

function formatClientCreated(channel: string, event: EventPayload): SlackMessage {
  const { name, clientId } = event.data as { name: string; clientId: string };

  return buildMessage(channel, {
    emoji: ":bust_in_silhouette:",
    title: "New Client Created",
    color: "#2eb886",
    fields: [
      { label: "Client", value: name },
      { label: "ID", value: clientId },
    ],
    metadata: event.metadata,
  });
}

function formatClientUpdated(channel: string, event: EventPayload): SlackMessage {
  const { name, changes } = event.data as { name: string; changes: string[] };

  return buildMessage(channel, {
    emoji: ":pencil2:",
    title: "Client Updated",
    fields: [
      { label: "Client", value: name },
      ...(changes?.length ? [{ label: "Changed", value: changes.join(", ") }] : []),
    ],
    metadata: event.metadata,
  });
}

function formatClientDeleted(channel: string, event: EventPayload): SlackMessage {
  const { name, clientId } = event.data as { name: string; clientId: string };

  return buildMessage(channel, {
    emoji: ":wastebasket:",
    title: "Client Deleted",
    color: "#e01e5a",
    fields: [
      { label: "Client", value: name },
      { label: "ID", value: clientId },
    ],
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// BOOKING EVENTS
// ─────────────────────────────────────────────────────────────────────

function formatBookingCreated(channel: string, event: EventPayload): SlackMessage {
  const { bookingId, serviceType, scheduledAt, duration } = event.data as {
    bookingId: string;
    serviceType: string;
    scheduledAt: string;
    duration: number;
  };

  return buildMessage(channel, {
    emoji: ":calendar:",
    title: "New Booking Created",
    color: "#4a90d9",
    fields: [
      { label: "Booking", value: bookingId },
      { label: "Service", value: serviceType },
      {
        label: "Scheduled",
        value: new Date(scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      },
      { label: "Duration", value: `${duration} min` },
    ],
    metadata: event.metadata,
  });
}

function formatBookingConfirmed(channel: string, event: EventPayload): SlackMessage {
  const { bookingId } = event.data as { bookingId: string };

  return buildMessage(channel, {
    emoji: ":white_check_mark:",
    title: "Booking Confirmed",
    color: "#36a64f",
    fields: [{ label: "Booking", value: bookingId }],
    metadata: event.metadata,
  });
}

function formatBookingCancelled(channel: string, event: EventPayload): SlackMessage {
  const { bookingId, reason, cancelledBy } = event.data as {
    bookingId: string;
    reason: string;
    cancelledBy: string;
  };

  return buildMessage(channel, {
    emoji: ":x:",
    title: "Booking Cancelled",
    color: "#e01e5a",
    fields: [
      { label: "Booking", value: bookingId },
      { label: "Cancelled By", value: cancelledBy },
      { label: "Reason", value: reason },
    ],
    metadata: event.metadata,
  });
}

function formatBookingCompleted(channel: string, event: EventPayload): SlackMessage {
  const { bookingId, duration } = event.data as { bookingId: string; duration: number };

  return buildMessage(channel, {
    emoji: ":star:",
    title: "Booking Completed",
    color: "#36a64f",
    fields: [
      { label: "Booking", value: bookingId },
      { label: "Duration", value: `${duration} min` },
    ],
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// PAYMENT EVENTS
// ─────────────────────────────────────────────────────────────────────

function formatPaymentInitiated(channel: string, event: EventPayload): SlackMessage {
  const { paymentId, amount, currency, provider } = event.data as {
    paymentId: string;
    amount: number;
    currency: string;
    provider: string;
  };

  return buildMessage(channel, {
    emoji: ":credit_card:",
    title: "Payment Initiated",
    fields: [
      { label: "Payment", value: paymentId },
      { label: "Amount", value: `${currency} ${amount}` },
      { label: "Provider", value: provider },
    ],
    metadata: event.metadata,
  });
}

function formatPaymentCompleted(channel: string, event: EventPayload): SlackMessage {
  const { paymentId, amount, transactionId } = event.data as {
    paymentId: string;
    amount: number;
    transactionId: string;
  };

  return buildMessage(channel, {
    emoji: ":moneybag:",
    title: "Payment Completed",
    color: "#36a64f",
    fields: [
      { label: "Payment", value: paymentId },
      { label: "Amount", value: `INR ${amount}` },
      { label: "Transaction", value: transactionId },
    ],
    metadata: event.metadata,
  });
}

function formatPaymentFailed(channel: string, event: EventPayload): SlackMessage {
  const { paymentId, reason } = event.data as { paymentId: string; reason: string };

  return buildMessage(channel, {
    emoji: ":warning:",
    title: "Payment Failed",
    color: "#e01e5a",
    fields: [
      { label: "Payment", value: paymentId },
      { label: "Reason", value: reason },
    ],
    metadata: event.metadata,
  });
}

function formatRefundInitiated(channel: string, event: EventPayload): SlackMessage {
  const { refundId, paymentId, amount } = event.data as {
    refundId: string;
    paymentId: string;
    amount: number;
  };

  return buildMessage(channel, {
    emoji: ":leftwards_arrow_with_hook:",
    title: "Refund Initiated",
    fields: [
      { label: "Refund", value: refundId },
      { label: "Payment", value: paymentId },
      { label: "Amount", value: `INR ${amount}` },
    ],
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// REPORT EVENTS
// ─────────────────────────────────────────────────────────────────────

function formatReportGenerated(channel: string, event: EventPayload): SlackMessage {
  const { reportId, type, clientId } = event.data as {
    reportId: string;
    type: string;
    clientId: string;
  };

  return buildMessage(channel, {
    emoji: ":page_facing_up:",
    title: "Report Generated",
    color: "#4a90d9",
    fields: [
      { label: "Report", value: reportId },
      { label: "Type", value: type },
      { label: "Client", value: clientId },
    ],
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// MEDIA EVENTS
// ─────────────────────────────────────────────────────────────────────

function formatMediaUploaded(channel: string, event: EventPayload): SlackMessage {
  const { fileId, bucket, mimeType, size } = event.data as {
    fileId: string;
    bucket: string;
    mimeType: string;
    size: number;
  };

  const sizeStr =
    size > 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`;

  return buildMessage(channel, {
    emoji: ":file_folder:",
    title: "Media Uploaded",
    fields: [
      { label: "File", value: fileId },
      { label: "Bucket", value: bucket },
      { label: "Type", value: mimeType },
      { label: "Size", value: sizeStr },
    ],
    metadata: event.metadata,
  });
}

function formatMediaDeleted(channel: string, event: EventPayload): SlackMessage {
  const { fileId } = event.data as { fileId: string };

  return buildMessage(channel, {
    emoji: ":wastebasket:",
    title: "Media Deleted",
    fields: [{ label: "File", value: fileId }],
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// GENERIC FALLBACK
// ─────────────────────────────────────────────────────────────────────

function formatGenericEvent(channel: string, event: EventPayload): SlackMessage {
  const dataStr = Object.entries(event.data)
    .map(([k, v]) => `*${k}:* ${v}`)
    .join("\n");

  return buildMessage(channel, {
    emoji: ":bell:",
    title: event.type,
    fields: [],
    body: dataStr,
    metadata: event.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────
// EVENT → FORMATTER MAPPING
// ─────────────────────────────────────────────────────────────────────

const EVENT_FORMATTERS: Record<string, (channel: string, event: EventPayload) => SlackMessage> = {
  // Auth
  "user.registered": formatUserRegistered,
  "user.login": formatUserLogin,
  "user.logout": formatUserLogout,
  "auth.password_reset_requested": formatPasswordResetRequested,
  "auth.password_changed": formatPasswordChanged,
  "auth.email_verified": formatEmailVerified,
  // Client
  "client.created": formatClientCreated,
  "client.updated": formatClientUpdated,
  "client.deleted": formatClientDeleted,
  // Booking
  "booking.created": formatBookingCreated,
  "booking.confirmed": formatBookingConfirmed,
  "booking.cancelled": formatBookingCancelled,
  "booking.completed": formatBookingCompleted,
  // Payment
  "payment.initiated": formatPaymentInitiated,
  "payment.completed": formatPaymentCompleted,
  "payment.failed": formatPaymentFailed,
  "refund.initiated": formatRefundInitiated,
  // Report
  "report.generated": formatReportGenerated,
  // Media
  "media.uploaded": formatMediaUploaded,
  "media.deleted": formatMediaDeleted,
};

// ─────────────────────────────────────────────────────────────────────
// BLOCK KIT BUILDER
// ─────────────────────────────────────────────────────────────────────

interface MessageOptions {
  emoji: string;
  title: string;
  color?: string;
  fields?: { label: string; value: string }[];
  body?: string;
  metadata: EventPayload["metadata"];
}

function buildMessage(channel: string, opts: MessageOptions): SlackMessage {
  const blocks: SlackBlock[] = [];

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `${opts.emoji}  ${opts.title}`,
      emoji: true,
    },
  });

  // Fields (two-column layout)
  if (opts.fields && opts.fields.length > 0) {
    blocks.push({
      type: "section",
      fields: opts.fields.map((f) => ({
        type: "mrkdwn",
        text: `*${f.label}:*\n${f.value}`,
      })),
    });
  }

  // Body text (for generic events)
  if (opts.body) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: opts.body },
    });
  }

  // Divider
  blocks.push({ type: "divider" });

  // Context footer
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*Source:* ${opts.metadata.source}  |  *Event:* ${opts.metadata.eventId.slice(0, 8)}  |  _${new Date(opts.metadata.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`,
      },
    ],
  });

  return {
    channel,
    text: `${opts.emoji} ${opts.title}`,
    blocks,
  };
}

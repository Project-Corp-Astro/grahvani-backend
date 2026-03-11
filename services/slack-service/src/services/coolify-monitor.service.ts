import { logger } from "../config/logger";
import { getCoolifyConfig, GRAHVANI_APPS, GRAHVANI_HEALTH_URLS } from "../config/coolify";
import { postMessage, SlackBlock } from "./slack.service";

// ─────────────────────────────────────────────────────────────────────
// STATE — Track previous statuses to detect changes
// ─────────────────────────────────────────────────────────────────────

interface AppState {
  status: string;
  lastSeen: Date;
  downSince: Date | null;
}

const appStates: Map<string, AppState> = new Map();
let monitorInterval: ReturnType<typeof setInterval> | null = null;
let isFirstRun = true;

// ─────────────────────────────────────────────────────────────────────
// COOLIFY API CLIENT
// ─────────────────────────────────────────────────────────────────────

interface CoolifyApp {
  name: string;
  uuid: string;
  status: string;
  fqdn: string | null;
  limits_memory: string | null;
  limits_cpus: string | null;
  last_online_at: string | null;
  updated_at: string | null;
  ports_exposes: string | null;
}

async function fetchAppDetails(uuid: string): Promise<CoolifyApp | null> {
  const config = getCoolifyConfig();
  try {
    const res = await fetch(`${config.apiUrl}/api/v1/applications/${uuid}`, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CoolifyApp;
  } catch (err) {
    logger.error({ err, uuid }, "Failed to fetch app from Coolify");
    return null;
  }
}

async function fetchHealthEndpoint(
  url: string,
): Promise<{ ok: boolean; latencyMs: number; status: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return { ok: res.ok, latencyMs: Date.now() - start, status: res.status };
  } catch {
    return { ok: false, latencyMs: Date.now() - start, status: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────
// MONITOR LOOP
// ─────────────────────────────────────────────────────────────────────

async function runMonitorCycle(): Promise<void> {
  const config = getCoolifyConfig();
  const appNames = Object.keys(GRAHVANI_APPS);
  const now = new Date();

  const results: {
    name: string;
    status: string;
    healthOk: boolean;
    latencyMs: number;
    memory: string;
    changed: boolean;
    downSince: Date | null;
  }[] = [];

  // Fetch all app statuses and health in parallel
  await Promise.all(
    appNames.map(async (name) => {
      const uuid = GRAHVANI_APPS[name];
      const healthUrl = GRAHVANI_HEALTH_URLS[name];

      const [app, health] = await Promise.all([
        fetchAppDetails(uuid),
        healthUrl ? fetchHealthEndpoint(healthUrl) : Promise.resolve(null),
      ]);

      const status = app?.status || "unknown";
      const prevState = appStates.get(name);
      const changed = prevState ? prevState.status !== status : false;

      // Track downtime
      let downSince = prevState?.downSince || null;
      const isDown = !status.includes("healthy");

      if (isDown && !downSince) {
        downSince = now;
      } else if (!isDown) {
        downSince = null;
      }

      appStates.set(name, { status, lastSeen: now, downSince });

      results.push({
        name,
        status,
        healthOk: health?.ok ?? false,
        latencyMs: health?.latencyMs ?? 0,
        memory: app?.limits_memory || "N/A",
        changed,
        downSince,
      });
    }),
  );

  // Detect state changes (status transitions)
  const changes = results.filter((r) => r.changed);
  const downApps = results.filter((r) => r.downSince !== null);

  if (isFirstRun) {
    // On first run, post a full status dashboard
    await postStatusDashboard(results, config.opsChannel);
    isFirstRun = false;
    return;
  }

  // Post alerts for state changes
  for (const change of changes) {
    await postStateChange(change, config.opsChannel);
  }

  // Post downtime alerts (if any app has been down for a while)
  for (const app of downApps) {
    if (app.downSince) {
      const downMinutes = Math.round((now.getTime() - app.downSince.getTime()) / 60000);
      // Alert at 5, 15, 30, 60 minute marks
      if ([5, 15, 30, 60].includes(downMinutes)) {
        await postDowntimeAlert(app.name, downMinutes, config.opsChannel);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// SLACK MESSAGE BUILDERS
// ─────────────────────────────────────────────────────────────────────

function statusEmoji(status: string): string {
  if (status.includes("healthy")) return ":large_green_circle:";
  if (status.includes("running")) return ":large_yellow_circle:";
  if (status.includes("stopped") || status.includes("exited")) return ":red_circle:";
  return ":white_circle:";
}

async function postStatusDashboard(
  results: {
    name: string;
    status: string;
    healthOk: boolean;
    latencyMs: number;
    memory: string;
  }[],
  channel: string,
): Promise<void> {
  const healthy = results.filter((r) => r.status.includes("healthy")).length;
  const total = results.length;
  const overallEmoji = healthy === total ? ":white_check_mark:" : ":warning:";

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${overallEmoji}  Grahvani Platform Status — ${healthy}/${total} Healthy`,
        emoji: true,
      },
    },
    { type: "divider" },
  ];

  // Group into rows of service status
  for (const r of results) {
    const emoji = statusEmoji(r.status);
    const latency = r.healthOk ? `${r.latencyMs}ms` : "N/A";
    const statusClean = r.status.replace("running:", "").replace("running", "running");

    blocks.push({
      type: "section",
      fields: [
        { type: "mrkdwn", text: `${emoji} *${r.name}*` },
        { type: "mrkdwn", text: `Status: \`${statusClean}\`` },
        { type: "mrkdwn", text: `Latency: \`${latency}\`` },
        { type: "mrkdwn", text: `Memory: \`${r.memory}\`` },
      ],
    });
  }

  // Total memory summary
  const totalMemMb = results.reduce((sum, r) => {
    const mem = r.memory?.replace("m", "");
    return sum + (parseInt(mem, 10) || 0);
  }, 0);

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `*Total Allocated:* ${(totalMemMb / 1024).toFixed(1)} GB / 16 GB  |  *Server:* KVM4 (147.93.30.201)  |  _${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`,
      },
    ],
  });

  await postMessage({
    channel,
    text: `Platform Status: ${healthy}/${total} healthy`,
    blocks,
  });
}

async function postStateChange(
  app: { name: string; status: string; changed: boolean },
  channel: string,
): Promise<void> {
  const isUp = app.status.includes("healthy");
  const emoji = isUp ? ":large_green_circle:" : ":red_circle:";
  const verb = isUp ? "is back UP" : "went DOWN";

  await postMessage({
    channel,
    text: `${app.name} ${verb}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji}  ${app.name} ${verb}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Service:*\n${app.name}` },
          { type: "mrkdwn", text: `*Status:*\n\`${app.status}\`` },
        ],
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`,
          },
        ],
      },
    ],
  });
}

async function postDowntimeAlert(
  name: string,
  downMinutes: number,
  channel: string,
): Promise<void> {
  await postMessage({
    channel,
    text: `${name} has been down for ${downMinutes} minutes`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `:rotating_light:  ${name} — DOWN for ${downMinutes} min`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${name}* has been unreachable for *${downMinutes} minutes*.\nCheck Coolify dashboard or service logs.`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open Coolify", emoji: true },
            url: "http://147.93.30.201:8000",
          },
        ],
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`,
          },
        ],
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────
// DEPLOYMENT TRACKING
// ─────────────────────────────────────────────────────────────────────

const lastDeploymentIds: Map<string, string> = new Map();

async function checkDeployments(): Promise<void> {
  const config = getCoolifyConfig();

  for (const [name, uuid] of Object.entries(GRAHVANI_APPS)) {
    try {
      const res = await fetch(
        `${config.apiUrl}/api/v1/applications/${uuid}/deployments?per_page=1`,
        {
          headers: { Authorization: `Bearer ${config.apiToken}` },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!res.ok) continue;

      const data = (await res.json()) as
        | { data?: { deployment_uuid: string; status: string; created_at: string }[] }
        | { deployment_uuid: string; status: string; created_at: string }[];

      const deployments = Array.isArray(data) ? data : data.data || [];
      if (deployments.length === 0) continue;

      const latest = deployments[0];
      const deployId = latest.deployment_uuid;
      const prevId = lastDeploymentIds.get(uuid);

      if (prevId && prevId !== deployId) {
        // New deployment detected
        await postDeploymentEvent(name, latest, config.opsChannel);
      }

      lastDeploymentIds.set(uuid, deployId);
    } catch (err) {
      logger.debug({ err, name }, "Failed to check deployments");
    }
  }
}

async function postDeploymentEvent(
  name: string,
  deploy: { status: string; created_at: string; deployment_uuid: string },
  channel: string,
): Promise<void> {
  const isSuccess = deploy.status === "finished";
  const emoji = isSuccess ? ":rocket:" : ":x:";
  const statusText = isSuccess ? "Deployed Successfully" : `Deploy ${deploy.status}`;

  await postMessage({
    channel,
    text: `${name}: ${statusText}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji}  ${name} — ${statusText}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Service:*\n${name}` },
          { type: "mrkdwn", text: `*Status:*\n\`${deploy.status}\`` },
          {
            type: "mrkdwn",
            text: `*Deployed At:*\n${new Date(deploy.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
          },
          { type: "mrkdwn", text: `*Deploy ID:*\n\`${deploy.deployment_uuid.slice(0, 12)}\`` },
        ],
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}_`,
          },
        ],
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────

export const coolifyMonitor = {
  async start(): Promise<void> {
    const config = getCoolifyConfig();

    if (!config.enabled) {
      logger.warn("Coolify monitoring disabled — COOLIFY_API_TOKEN not set");
      return;
    }

    logger.info(
      { pollInterval: config.pollIntervalMs, apps: Object.keys(GRAHVANI_APPS).length },
      "Starting Coolify monitor",
    );

    // Run first check immediately
    await runMonitorCycle();
    await checkDeployments();

    // Set up periodic polling
    monitorInterval = setInterval(async () => {
      try {
        await runMonitorCycle();
        await checkDeployments();
      } catch (err) {
        logger.error({ err }, "Monitor cycle failed");
      }
    }, config.pollIntervalMs);
  },

  async stop(): Promise<void> {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
      logger.info("Coolify monitor stopped");
    }
  },

  /** Force a status dashboard post (can be triggered via API) */
  async forceStatusUpdate(): Promise<void> {
    isFirstRun = true;
    await runMonitorCycle();
  },
};

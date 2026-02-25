import { logger } from "./logger";

export interface CoolifyConfig {
  apiUrl: string;
  apiToken: string;
  serverUuid: string;
  enabled: boolean;
  pollIntervalMs: number;
  opsChannel: string;
}

// Grahvani app UUIDs on Coolify (KVM4)
export const GRAHVANI_APPS: Record<string, string> = {
  "Auth Service": "eg48400cgoc8cwocos8cosg8",
  "User Service": "jscos8kcwookg48ws8408o8g",
  "Client Service": "r8wwc4cggko40cs0cs8s8ogs",
  "Astro Engine": "qkgsko0kkoc004w0w04okggk",
  "API Gateway": "eoc4w0ckg8gsw8o4kgkwsosw",
  Frontend: "lk0cksw804s4oc4c4o88ws48",
  "Slack Service": "bckw44gcw0cs4co4g88g8gk0",
};

export const GRAHVANI_HEALTH_URLS: Record<string, string> = {
  "Auth Service": "https://api-auth.grahvani.in/health",
  "User Service": "https://api-user.grahvani.in/health",
  "Client Service": "https://api-client.grahvani.in/health",
  "Astro Engine": "https://api-astro.grahvani.in/health",
  "API Gateway": "https://api-gateway.grahvani.in/health",
  Frontend: "https://grahvani.in/api/health",
  "Slack Service": "https://api-slack.grahvani.in/health",
};

export function getCoolifyConfig(): CoolifyConfig {
  const apiToken = process.env.COOLIFY_API_TOKEN || "";
  const enabled = !!apiToken;

  if (!apiToken) {
    logger.warn("COOLIFY_API_TOKEN not set — infrastructure monitoring disabled");
  }

  return {
    apiUrl: process.env.COOLIFY_API_URL || "http://147.93.30.201:8000",
    apiToken,
    serverUuid: process.env.COOLIFY_SERVER_UUID || "y440w0wk84w84c0sssgwo4co",
    enabled,
    pollIntervalMs: parseInt(process.env.COOLIFY_POLL_INTERVAL_MS || "300000", 10), // 5 min default
    opsChannel: process.env.SLACK_CHANNEL_OPS || "C0AGGU3920P", // #grahvani-ops
  };
}

import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";

import { errorMiddleware } from "./middleware/error.middleware";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics.middleware";
import { requestIdMiddleware } from "@grahvani/contracts";
import { getSlackConfig } from "./config/slack";
import { getCoolifyConfig } from "./config/coolify";
import { coolifyMonitor } from "./services/coolify-monitor.service";

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(pino());

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Slack Service API" });
});

// Metrics Endpoint
app.get("/metrics", metricsHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  const slackConfig = getSlackConfig();
  const coolifyConfig = getCoolifyConfig();
  res.status(200).json({
    status: "ok",
    service: "slack-service",
    slack: {
      enabled: slackConfig.enabled,
      defaultChannel: slackConfig.defaultChannel,
    },
    coolify: {
      monitoring: coolifyConfig.enabled,
      pollIntervalMs: coolifyConfig.pollIntervalMs,
    },
  });
});

// Force a status dashboard post to #grahvani-ops
app.post("/status", async (req: Request, res: Response) => {
  try {
    await coolifyMonitor.forceStatusUpdate();
    res.json({ message: "Status dashboard posted to #grahvani-ops" });
  } catch (err) {
    res.status(500).json({ error: "Failed to post status" });
  }
});

// Global Error Handler (must be last)
app.use(errorMiddleware);

export default app;

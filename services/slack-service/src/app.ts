import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";

import { errorMiddleware } from "./middleware/error.middleware";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics.middleware";
import { requestIdMiddleware } from "@grahvani/contracts";
import { getSlackConfig } from "./config/slack";

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
  const config = getSlackConfig();
  res.status(200).json({
    status: "ok",
    service: "slack-service",
    slack: {
      enabled: config.enabled,
      defaultChannel: config.defaultChannel,
    },
  });
});

// Global Error Handler (must be last)
app.use(errorMiddleware);

export default app;

import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";

import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";
import {
  metricsMiddleware,
  metricsHandler,
} from "./middleware/metrics.middleware";
import { requestIdMiddleware } from "@grahvani/contracts";
import { getDatabaseManager } from "./config/db-pro";
import { getStorageConfig } from "./config/storage";

const app: Express = express();

// Initialize Database Manager
getDatabaseManager();
import { logger } from "./config/logger";
logger.info("Database manager initialized");

// Log storage configuration
const storageConfig = getStorageConfig();
logger.info(
  { adapter: storageConfig.adapter, path: storageConfig.localPath },
  "Storage configured",
);

// Trust proxy configuration for Rate Limiting
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "https://grahvani.in",
            "https://www.grahvani.in",
            "https://admin.grahvani.in",
          ]
        : "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(requestIdMiddleware);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    },
  },
});
app.use(limiter);

app.use(metricsMiddleware);
app.use(pino());

// Serve uploaded files (local adapter only)
if (storageConfig.adapter === "local" && storageConfig.localPath) {
  app.use(
    "/api/v1/media/files",
    express.static(path.resolve(storageConfig.localPath), {
      maxAge: "7d",
      etag: true,
      lastModified: true,
    }),
  );
}

// API Routes
app.use("/api/v1", routes);

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Media Service API" });
});

// Metrics Endpoint
app.get("/metrics", metricsHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "media-service" });
});

// Global Error Handler (must be last)
app.use(errorMiddleware);

export default app;

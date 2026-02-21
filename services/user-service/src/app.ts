import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import rateLimit from "express-rate-limit";

import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics.middleware";
import { requestIdMiddleware } from "@grahvani/contracts";
import { getDatabaseManager } from "./config/db-pro";

const app: Express = express();

// Initialize Database Manager
getDatabaseManager();
import { logger } from "./config/logger";
logger.info("Database manager initialized (Standardized Port 6543)");

// Trust proxy configuration for Rate Limiting
// Dev: false (Direct access, no proxy) | Prod: 1 (Behind single Reverse Proxy)
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
app.use(express.json({ limit: "10kb" }));
app.use(requestIdMiddleware);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

// API Routes
app.use("/api/v1", routes);

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "User Service API" });
});

// Metrics Endpoint
app.get("/metrics", metricsHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "user-service" });
});

// Global Error Handler (must be last)
app.use(errorMiddleware);

export default app;

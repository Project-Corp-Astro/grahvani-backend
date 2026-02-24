import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import compression from "compression"; // Optimized: GZIP
import rateLimit from "express-rate-limit"; // Security: Rate Limiting

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

// Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window (High due to heavy polling nature)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    },
  },
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://grahvani.in", "https://www.grahvani.in", "https://admin.grahvani.in"]
        : "*",
    credentials: true,
  }),
);
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: "10kb" }));
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(pino());

// API Routes
app.use("/api/v1", routes);

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Client Service API" });
});

// Metrics Endpoint
app.get("/metrics", metricsHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "client-service" });
});

// Error Handling
app.use(errorMiddleware);

export default app;

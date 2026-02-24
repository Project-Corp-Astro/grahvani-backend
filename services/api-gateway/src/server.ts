import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import {
  metricsMiddleware,
  metricsHandler,
} from "./middleware/metrics.middleware";
import { logger } from "./config/logger";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 8080;

// Service URLs (Internal Docker Network)
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3002";
const CLIENT_SERVICE_URL =
  process.env.CLIENT_SERVICE_URL || "http://localhost:3008";
const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://localhost:3007";

// Security & Optimization Middleware
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
app.use(compression());
app.use(metricsMiddleware);

// Request ID — generate or forward
app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Metrics Endpoint
app.get("/metrics", metricsHandler);

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway", timestamp: new Date() });
});

// Proxy Configurations
const proxyOptions: Options = {
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq: any, req: any, _res: any) => {
      // Forward request ID to downstream services
      const requestId = req.headers["x-request-id"];
      if (requestId) {
        proxyReq.setHeader("x-request-id", requestId);
      }
    },
    error: (err: Error, _req: any, res: any) => {
      logger.error({ err }, "Proxy error");
      res.status(502).json({ error: "Service Unavailable (Gateway Error)" });
    },
  },
};

// 1. Auth Service Routes
app.use(
  createProxyMiddleware({
    ...proxyOptions,
    pathFilter: "/api/v1/auth",
    target: AUTH_SERVICE_URL,
  }),
);

// 2. User Service Routes
app.use(
  createProxyMiddleware({
    ...proxyOptions,
    pathFilter: "/api/v1/users",
    target: USER_SERVICE_URL,
  }),
);

// 3. Client Service Routes
app.use(
  createProxyMiddleware({
    ...proxyOptions,
    pathFilter: "/api/v1/clients",
    target: CLIENT_SERVICE_URL,
  }),
);

// 4. Client Service Geocode (Special Case)
app.use(
  createProxyMiddleware({
    ...proxyOptions,
    pathFilter: "/api/v1/geocode",
    target: CLIENT_SERVICE_URL,
  }),
);

// 5. Media Service Routes
app.use(
  createProxyMiddleware({
    ...proxyOptions,
    pathFilter: "/api/v1/media",
    target: MEDIA_SERVICE_URL,
  }),
);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found via Gateway" });
});

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      routes: {
        auth: AUTH_SERVICE_URL,
        user: USER_SERVICE_URL,
        client: CLIENT_SERVICE_URL,
        media: MEDIA_SERVICE_URL,
      },
    },
    "API Gateway started",
  );
});

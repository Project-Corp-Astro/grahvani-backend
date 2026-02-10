import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./routes";
import internalRoutes from "./routes/internal.routes";
import { logger } from "./config/logger";
import { lahiriClient } from "./clients";
import { cacheService } from "./services/cache.service";
import {
  apiRateLimiter,
  internalRateLimiter,
  metricsMiddleware,
  metricsHandler,
} from "./middleware";

const app = express();

// =============================================================================
// SECURITY MIDDLEWARES
// =============================================================================
app.use(helmet());
app.use(
  cors({
    origin: "*", // Internal service - allow all origins (protected by rate limiting)
  }),
);
app.use(express.json({ limit: "1mb" }));

// =============================================================================
// OBSERVABILITY MIDDLEWARES
// =============================================================================
app.use(metricsMiddleware);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers["x-request-id"] = requestId;

  res.on("finish", () => {
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});

// =============================================================================
// HEALTH PROBES (Kubernetes Ready)
// =============================================================================

// Liveness probe - is the service alive?
app.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - is the service ready to accept traffic?
app.get("/ready", async (_req: Request, res: Response) => {
  const cacheReady = cacheService.isAvailable();
  const isReady = cacheReady; // Add more checks as needed

  if (isReady) {
    res.status(200).json({
      status: "ready",
      cache: cacheReady,
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      cache: cacheReady,
    });
  }
});

// Full health check - detailed status
app.get("/health", async (_req: Request, res: Response) => {
  const externalHealth = await lahiriClient.healthCheck();
  const cacheAvailable = cacheService.isAvailable();

  const overallHealthy = externalHealth && cacheAvailable;

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? "healthy" : "degraded",
    service: "astro-engine-proxy",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    components: {
      cache: {
        status: cacheAvailable ? "up" : "down",
        type: "redis",
      },
      externalAstroEngine: {
        status: externalHealth ? "up" : "down",
        url: process.env.ASTRO_ENGINE_EXTERNAL_URL || "configured",
      },
    },
  });
});

// Prometheus metrics endpoint
app.get("/metrics", metricsHandler);

// =============================================================================
// API ROUTES (Rate Limited)
// =============================================================================
// Public API: /api/charts/*, /api/kp/*, /api/dasha/*, /api/ashtakavarga/*, /api/raman/*
app.use("/api", apiRateLimiter, apiRoutes);

// =============================================================================
// INTERNAL ROUTES (Higher Rate Limit)
// =============================================================================
// Legacy /internal routes for existing client-service integration
app.use("/internal", internalRateLimiter, internalRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      requestId: req.headers["x-request-id"],
      path: req.path,
    },
    "Unhandled error",
  );

  res.status(500).json({
    success: false,
    error: "Internal server error",
    requestId: req.headers["x-request-id"],
  });
});

// =============================================================================
// 404 HANDLER
// =============================================================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
  });
});

export default app;

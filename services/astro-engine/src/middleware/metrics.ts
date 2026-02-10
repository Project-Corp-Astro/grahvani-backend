import client from "prom-client";
import { Request, Response, NextFunction } from "express";

// =============================================================================
// PROMETHEUS METRICS
// For monitoring and alerting in production
// =============================================================================

// Create registry
const register = new client.Registry();

// Add default metrics (GC, memory, event loop, etc.)
client.collectDefaultMetrics({
  register,
  prefix: "astro_engine_",
});

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: "astro_engine_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: "astro_engine_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const externalApiCallDuration = new client.Histogram({
  name: "astro_engine_external_api_duration_seconds",
  help: "Duration of external Astro Engine API calls",
  labelNames: ["endpoint", "status"],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

export const externalApiCallTotal = new client.Counter({
  name: "astro_engine_external_api_calls_total",
  help: "Total number of external Astro Engine API calls",
  labelNames: ["endpoint", "status"],
  registers: [register],
});

export const cacheHit = new client.Counter({
  name: "astro_engine_cache_hits_total",
  help: "Total number of cache hits",
  labelNames: ["type"],
  registers: [register],
});

export const cacheMiss = new client.Counter({
  name: "astro_engine_cache_misses_total",
  help: "Total number of cache misses",
  labelNames: ["type"],
  registers: [register],
});

export const circuitBreakerState = new client.Gauge({
  name: "astro_engine_circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=half-open, 2=open)",
  labelNames: ["circuit"],
  registers: [register],
});

// Middleware to track request metrics
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || "unknown";
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
}

// Endpoint handler for /metrics
export async function metricsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error: any) {
    res.status(500).end(error.message);
  }
}

export { register };

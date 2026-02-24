import client from "prom-client";
import { Request, Response, NextFunction } from "express";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "api_gateway_",
});

export const httpRequestDuration = new client.Histogram({
  name: "api_gateway_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: "api_gateway_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const proxyDuration = new client.Histogram({
  name: "api_gateway_proxy_duration_seconds",
  help: "Duration of proxied requests to downstream services",
  labelNames: ["target_service", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
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

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error: any) {
    res.status(500).end(error.message);
  }
}

export { register };

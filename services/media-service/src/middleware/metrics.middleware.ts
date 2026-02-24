import { Request, Response, NextFunction } from "express";
import client from "prom-client";

// Create a Registry
const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
});

const httpRequestTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
});

const fileUploadTotal = new client.Counter({
    name: "media_file_uploads_total",
    help: "Total number of file uploads",
    labelNames: ["bucket", "category"],
    registers: [register],
});

const fileUploadSize = new client.Histogram({
    name: "media_file_upload_size_bytes",
    help: "Size of uploaded files in bytes",
    labelNames: ["bucket"],
    buckets: [1024, 10240, 102400, 1048576, 5242880, 10485760, 52428800],
    registers: [register],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    const end = httpRequestDuration.startTimer();

    res.on("finish", () => {
        const route = req.route?.path || req.path;
        const labels = {
            method: req.method,
            route,
            status_code: res.statusCode.toString(),
        };
        end(labels);
        httpRequestTotal.inc(labels);
    });

    next();
}

export function metricsHandler(_req: Request, res: Response) {
    res.set("Content-Type", register.contentType);
    register.metrics().then((data) => res.end(data));
}

export function recordUpload(bucket: string, category: string, size: number) {
    fileUploadTotal.inc({ bucket, category });
    fileUploadSize.observe({ bucket }, size);
}

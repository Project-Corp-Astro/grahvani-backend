import { Request, Response, NextFunction } from "express";
import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

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

const slackMessagesSent = new client.Counter({
  name: "slack_messages_sent_total",
  help: "Total Slack messages sent",
  labelNames: ["channel", "event_type"],
  registers: [register],
});

const slackMessagesFailed = new client.Counter({
  name: "slack_messages_failed_total",
  help: "Total Slack messages that failed to send",
  labelNames: ["channel", "reason"],
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

export function recordSlackSent(channel: string, eventType: string) {
  slackMessagesSent.inc({ channel, event_type: eventType });
}

export function recordSlackFailed(channel: string, reason: string) {
  slackMessagesFailed.inc({ channel, reason });
}

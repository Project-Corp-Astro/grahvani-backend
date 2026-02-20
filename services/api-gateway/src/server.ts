import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
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

// Security & Optimization Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("dev"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway", timestamp: new Date() });
});

// Proxy Configurations
const proxyOptions: Options = {
  changeOrigin: true,
  on: {
    proxyReq: (_proxyReq: any, _req: any, _res: any) => {
      // Forward headers if needed
    },
    error: (err: Error, _req: any, res: any) => {
      console.error("Proxy Error:", err);
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

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found via Gateway" });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`   - Auth Mapping: /api/v1/auth -> ${AUTH_SERVICE_URL}`);
  console.log(`   - User Mapping: /api/v1/users -> ${USER_SERVICE_URL}`);
  console.log(`   - Client Mapping: /api/v1/clients -> ${CLIENT_SERVICE_URL}`);
});

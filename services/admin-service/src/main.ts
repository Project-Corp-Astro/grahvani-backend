// Admin Service Entry Point
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { logger } from "./config/logger";
import { getPrismaClient } from "./config/database";
import adminRoutes from "./routes";

const app = express();

// ============ SECURITY ============
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "https://admin.grahvani.in",
      "https://grahvani.in",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ============ REQUEST ID ============
app.use((req, _res, next) => {
  const requestId = req.headers["x-request-id"] as string;
  if (requestId) {
    (req as any).requestId = requestId;
  }
  next();
});

// ============ HEALTH CHECK ============
app.get("/health", (_req, res) => {
  res.json({
    service: "admin-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ============ ROUTES ============
import internalRoutes from "./routes/internal.routes";
app.use("/internal", internalRoutes);
app.use("/api/v1/admin", adminRoutes);

// ============ 404 ============
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found",
      timestamp: new Date().toISOString(),
    },
  });
});

// ============ ERROR HANDLER ============
app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    },
  });
});

// ============ STARTUP ============
const start = async () => {
  try {
    // Initialize database connection
    getPrismaClient();
    logger.info("✅ Database connected");

    app.listen(config.port, () => {
      logger.info(
        `🚀 Admin Service running on port ${config.port} in ${config.env} mode`
      );
      logger.info(`📊 Health: http://localhost:${config.port}/health`);
      logger.info(`🔑 Admin API: http://localhost:${config.port}/api/v1/admin`);
    });
  } catch (error) {
    logger.fatal({ error }, "Failed to start Admin Service");
    process.exit(1);
  }
};

start();

export default app;

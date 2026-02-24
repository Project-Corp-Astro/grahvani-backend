/**
 * Database Connection Manager - User Service
 * Production-Grade Prisma Connection with Supabase Pro Plan
 *
 * Features:
 * - Singleton pattern with lazy initialization
 * - Automatic health monitoring
 * - Graceful shutdown with connection cleanup
 * - Transaction timeout enforcement
 * - Connection metrics tracking
 * - Auto-recovery from transient failures
 *
 * @version 4.0.0 - Hardened for Supabase (Feb 6, 2026)
 */

import { PrismaClient } from "../generated/prisma";
import { logger } from "./logger";

interface ConnectionMetrics {
  totalQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
  uptime: number;
}

const SERVICE_NAME = "user-service";

export class DatabaseManager {
  private prismaClient: PrismaClient | null = null;
  private metrics: ConnectionMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private startTime: Date;
  private isShuttingDown = false;

  constructor() {
    this.startTime = new Date();
    this.metrics = {
      totalQueries: 0,
      failedQueries: 0,
      avgQueryTime: 0,
      lastHealthCheck: null,
      isHealthy: false,
      uptime: 0,
    };
    this.initializeClient();
    this.startHealthCheck();
  }

  /**
   * Initialize Prisma client with optimized configuration
   */
  private initializeClient(): void {
    try {
      let url = process.env.USER_DATABASE_URL || process.env.DATABASE_URL;

      if (!url) {
        throw new Error("DATABASE_URL not configured in environment");
      }

      // Auto-configure for Supabase Transaction Pooler
      const isPoolerMode = url.includes(":6543");
      if (isPoolerMode && !url.includes("pgbouncer=true")) {
        url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
      }
      if (process.env.NODE_ENV === "development" && !url.includes("connection_limit")) {
        url += (url.includes("?") ? "&" : "?") + "connection_limit=5";
      }

      logger.info(
        {
          service: SERVICE_NAME,
          poolerMode: isPoolerMode ? "transaction" : "session",
          url: url.replace(/:[^:@]+@/, ":****@"),
        },
        "Initializing Prisma client",
      );

      this.prismaClient = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? [
                { level: "warn", emit: "stdout" },
                { level: "error", emit: "stdout" },
              ]
            : [{ level: "error", emit: "stdout" }],
        errorFormat: "pretty",
        datasources: {
          db: { url },
        },
      });

      logger.info({ service: SERVICE_NAME }, "Database client initialized");
    } catch (error) {
      logger.error({ error }, "Failed to initialize database client");
      throw error;
    }
  }

  getClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error("Database client not initialized");
    }
    if (this.isShuttingDown) {
      throw new Error("Service is shutting down");
    }
    return this.prismaClient;
  }

  getPrismaClientSync(): PrismaClient {
    return this.getClient();
  }

  async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        const isTransient =
          error.code === "P1001" ||
          error.code === "P1002" ||
          error.code === "P1008" ||
          error.code === "P1017" ||
          error.message?.includes("Connection reset") ||
          error.message?.includes("ECONNRESET");

        if (!isTransient || attempt === maxRetries) {
          this.metrics.failedQueries++;
          throw error;
        }

        logger.warn({ attempt, maxRetries, error: error.message }, "Query failed, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError;
  }

  async withTransaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
      >,
    ) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    const client = this.getClient();

    try {
      return await client.$transaction(fn, {
        maxWait: options?.maxWait ?? 5000,
        timeout: options?.timeout ?? 300000,
      });
    } catch (error: any) {
      this.metrics.failedQueries++;
      logger.error({ error: error.message, code: error.code }, "Transaction failed");
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.prismaClient) return false;
      await this.prismaClient.$queryRaw`SELECT 1`;
      this.metrics.isHealthy = true;
      this.metrics.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      this.metrics.isHealthy = false;
      this.metrics.lastHealthCheck = new Date();
      logger.error({ error }, "Health check failed");
      return false;
    }
  }

  private startHealthCheck(): void {
    this.healthCheck();
    this.healthCheckTimer = setInterval(() => this.healthCheck(), 30000);
  }

  getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.prismaClient) {
      logger.info({ service: SERVICE_NAME }, "Disconnecting database...");
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
      logger.info({ service: SERVICE_NAME }, "Database disconnected");
    }
  }
}

// Singleton
let databaseManagerInstance: DatabaseManager | null = null;

export const getDatabaseManager = (): DatabaseManager => {
  if (!databaseManagerInstance) {
    databaseManagerInstance = new DatabaseManager();
  }
  return databaseManagerInstance;
};

export const getPrismaClient = async (): Promise<PrismaClient> => {
  return getDatabaseManager().getClient();
};

export const getDBMetrics = (): ConnectionMetrics => {
  return getDatabaseManager().getMetrics();
};

export const performHealthCheck = async (): Promise<{ status: string }> => {
  const healthy = await getDatabaseManager().healthCheck();
  return { status: healthy ? "healthy" : "unhealthy" };
};

// Graceful Shutdown
const shutdown = async (signal: string) => {
  if (databaseManagerInstance) {
    logger.info({ signal }, "Shutting down database connection");
    await databaseManagerInstance.disconnect();
    databaseManagerInstance = null;
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", async (error) => {
  logger.error({ error }, "Uncaught exception - cleaning up");
  await databaseManagerInstance?.disconnect();
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
});

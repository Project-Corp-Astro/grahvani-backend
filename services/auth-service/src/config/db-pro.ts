/**
 * Database Connection Manager - Auth Service
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

const SERVICE_NAME = "auth-service";

export class DatabaseManager {
  private prismaClient: PrismaClient | null = null;
  private metrics: ConnectionMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private startTime: Date;
  private isShuttingDown = false;
  private queryTimes: number[] = [];

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
      let url = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL;

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
                { level: "warn", emit: "event" },
                { level: "error", emit: "event" },
              ]
            : [{ level: "error", emit: "event" }],
        errorFormat: "pretty",
        datasources: {
          db: { url },
        },
      });

      // Log errors
      (this.prismaClient as any).$on("error", (e: any) => {
        this.metrics.failedQueries++;
        logger.error({ error: e }, "Prisma error");
      });

      (this.prismaClient as any).$on("warn", (e: any) => {
        logger.warn({ warning: e }, "Prisma warning");
      });

      logger.info({ service: SERVICE_NAME }, "Database client initialized");
    } catch (error) {
      logger.error({ error }, "Failed to initialize database client");
      throw error;
    }
  }

  /**
   * Get Prisma client with safety checks
   */
  getClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error("Database client not initialized");
    }

    if (this.isShuttingDown) {
      throw new Error("Service is shutting down - database unavailable");
    }

    return this.prismaClient;
  }

  /**
   * Synchronous getter for backward compatibility
   */
  getPrismaClientSync(): PrismaClient {
    return this.getClient();
  }

  /**
   * Execute with automatic retry on transient failures
   */
  async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Only retry on transient connection errors
        const isTransient =
          error.code === "P1001" || // Can't reach database
          error.code === "P1002" || // Database timeout
          error.code === "P1008" || // Operations timed out
          error.code === "P1017" || // Server closed connection
          error.message?.includes("Connection reset") ||
          error.message?.includes("ECONNRESET") ||
          error.message?.includes("Connection terminated");

        if (!isTransient || attempt === maxRetries) {
          this.metrics.failedQueries++;
          throw error;
        }

        logger.warn(
          {
            attempt,
            maxRetries,
            error: error.message,
          },
          "Query failed, retrying...",
        );

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError;
  }

  /**
   * Execute within managed transaction with timeout
   */
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
        timeout: options?.timeout ?? 300000, // 5 min default (matches DB setting)
      });
    } catch (error: any) {
      this.metrics.failedQueries++;
      logger.error(
        {
          error: error.message,
          code: error.code,
        },
        "Transaction failed",
      );
      throw error;
    }
  }

  /**
   * Health check
   */
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

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    // Initial check
    this.healthCheck();

    // Check every 30 seconds
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck();
    }, 30000);
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Graceful disconnect
   */
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

// ============ Singleton Instance ============
let databaseManagerInstance: DatabaseManager | null = null;

export const getDatabaseManager = (): DatabaseManager => {
  if (!databaseManagerInstance) {
    databaseManagerInstance = new DatabaseManager();
  }
  return databaseManagerInstance;
};

/**
 * Get Prisma client - Primary export for services
 */
export const getPrismaClient = async (): Promise<PrismaClient> => {
  return getDatabaseManager().getClient();
};

/**
 * Monitoring Exports
 */
export const getDBMetrics = (): ConnectionMetrics => {
  return getDatabaseManager().getMetrics();
};

export const performHealthCheck = async (): Promise<{ status: string }> => {
  const healthy = await getDatabaseManager().healthCheck();
  return { status: healthy ? "healthy" : "unhealthy" };
};

// ============ Graceful Shutdown ============
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

// Handle uncaught errors to prevent dangling connections
process.on("uncaughtException", async (error) => {
  logger.error({ error }, "Uncaught exception - cleaning up");
  await databaseManagerInstance?.disconnect();
  process.exit(1);
});

process.on("unhandledRejection", (reason, _promise) => {
  logger.error({ reason }, "Unhandled rejection");
});

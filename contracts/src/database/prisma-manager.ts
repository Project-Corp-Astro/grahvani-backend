/**
 * Shared Database Connection Manager
 *
 * Production-grade Prisma connection manager with:
 * - Singleton pattern with lazy initialization
 * - Automatic health monitoring (every 30s)
 * - Graceful shutdown with connection cleanup
 * - Transaction timeout enforcement
 * - Connection metrics tracking
 * - Auto-recovery from transient failures
 * - Auto-configuration for Supabase pooler
 *
 * Usage in services:
 *   import { createDatabaseManager } from "@grahvani/contracts";
 *   import { PrismaClient } from "../generated/prisma";
 *
 *   const { getDatabaseManager, getPrismaClient } = createDatabaseManager({
 *     serviceName: "user-service",
 *     databaseUrlEnvKey: "USER_DATABASE_URL",
 *     PrismaClientClass: PrismaClient,
 *   });
 */

export interface ConnectionMetrics {
  totalQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
  uptime: number;
}

export interface LoggerLike {
  info: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
}

export interface PrismaClientLike {
  $queryRaw: (query: any, ...values: any[]) => Promise<any>;
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
  $transaction: (fn: any, options?: any) => Promise<any>;
}

export interface DatabaseManagerConfig {
  serviceName: string;
  databaseUrlEnvKey: string;
  PrismaClientClass: new (options?: any) => PrismaClientLike;
  logger?: LoggerLike;
}

const noopLogger: LoggerLike = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class DatabaseManager<T extends PrismaClientLike = PrismaClientLike> {
  private prismaClient: T | null = null;
  private metrics: ConnectionMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private startTime: Date;
  private isShuttingDown = false;
  private config: DatabaseManagerConfig;
  private logger: LoggerLike;

  constructor(config: DatabaseManagerConfig) {
    this.config = config;
    this.logger = config.logger || noopLogger;
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

  private initializeClient(): void {
    try {
      let url = process.env[this.config.databaseUrlEnvKey] || process.env.DATABASE_URL;

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

      this.logger.info(
        {
          service: this.config.serviceName,
          poolerMode: isPoolerMode ? "transaction" : "session",
          url: url.replace(/:[^:@]+@/, ":****@"),
        },
        "Initializing Prisma client",
      );

      this.prismaClient = new this.config.PrismaClientClass({
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
      }) as T;

      this.logger.info({ service: this.config.serviceName }, "Database client initialized");
    } catch (error) {
      this.logger.error({ error }, "Failed to initialize database client");
      throw error;
    }
  }

  getClient(): T {
    if (!this.prismaClient) {
      throw new Error("Database client not initialized");
    }
    if (this.isShuttingDown) {
      throw new Error("Service is shutting down");
    }
    return this.prismaClient;
  }

  getPrismaClientSync(): T {
    return this.getClient();
  }

  async withRetry<R>(fn: () => Promise<R>, maxRetries = 3): Promise<R> {
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

        this.logger.warn(
          { attempt, maxRetries, error: error.message },
          "Query failed, retrying...",
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw lastError;
  }

  async withTransaction<R>(
    fn: (tx: any) => Promise<R>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<R> {
    const client = this.getClient();

    try {
      return await client.$transaction(fn, {
        maxWait: options?.maxWait ?? 5000,
        timeout: options?.timeout ?? 300000,
      });
    } catch (error: any) {
      this.metrics.failedQueries++;
      this.logger.error({ error: error.message, code: error.code }, "Transaction failed");
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
      this.logger.error({ error }, "Health check failed");
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
      this.logger.info({ service: this.config.serviceName }, "Disconnecting database...");
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
      this.logger.info({ service: this.config.serviceName }, "Database disconnected");
    }
  }
}

/**
 * Creates a singleton-managed DatabaseManager with helper functions.
 */
export function createDatabaseManager<T extends PrismaClientLike>(config: DatabaseManagerConfig) {
  let instance: DatabaseManager<T> | null = null;

  const getDatabaseManager = (): DatabaseManager<T> => {
    if (!instance) {
      instance = new DatabaseManager<T>(config);
    }
    return instance;
  };

  const getPrismaClient = (): T => {
    return getDatabaseManager().getClient();
  };

  const getDBMetrics = (): ConnectionMetrics => {
    return getDatabaseManager().getMetrics();
  };

  const performHealthCheck = async (): Promise<{ status: string }> => {
    const healthy = await getDatabaseManager().healthCheck();
    return { status: healthy ? "healthy" : "unhealthy" };
  };

  // Register graceful shutdown handlers
  const shutdown = async (signal: string) => {
    if (instance) {
      const logger = config.logger || noopLogger;
      logger.info({ signal }, "Shutting down database connection");
      await instance.disconnect();
      instance = null;
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT").then(() => process.exit(0)));
  process.on("SIGTERM", () => shutdown("SIGTERM").then(() => process.exit(0)));

  return {
    getDatabaseManager,
    getPrismaClient,
    getDBMetrics,
    performHealthCheck,
  };
}

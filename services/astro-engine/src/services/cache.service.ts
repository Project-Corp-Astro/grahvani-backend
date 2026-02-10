import Redis from "ioredis";
import crypto from "crypto";
import { config } from "../config";
import { logger } from "../config/logger";

class CacheService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        logger.info("Redis connected");
      });

      this.redis.on("error", (err) => {
        this.isConnected = false;
        logger.error({ err }, "Redis connection error");
      });

      this.redis.connect().catch((err) => {
        logger.warn(
          { err },
          "Redis initial connection failed, continuing without cache",
        );
      });
    } catch (error) {
      logger.warn(
        { error },
        "Failed to initialize Redis, continuing without cache",
      );
    }
  }

  /**
   * Generate cache key from birth data
   */
  private generateKey(prefix: string, data: Record<string, any>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    const hash = crypto.createHash("sha256").update(normalized).digest("hex");
    return `astro:${prefix}:${hash}`;
  }

  /**
   * Get cached result
   */
  async get<T>(prefix: string, data: Record<string, any>): Promise<T | null> {
    if (!this.isConnected || !this.redis) return null;

    try {
      const key = this.generateKey(prefix, data);
      const cached = await this.redis.get(key);

      if (cached) {
        logger.info({ key }, "Cache HIT");
        return JSON.parse(cached);
      }

      logger.info({ key }, "Cache MISS");
      return null;
    } catch (error) {
      logger.error({ error }, "Cache get error");
      return null;
    }
  }

  /**
   * Set cache with TTL
   * @param ttlSeconds - Optional custom TTL, defaults to config value
   */
  async set(
    prefix: string,
    data: Record<string, any>,
    value: any,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!this.isConnected || !this.redis) return;

    try {
      const key = this.generateKey(prefix, data);
      const ttl = ttlSeconds || config.redis.ttlSeconds;
      await this.redis.setex(key, ttl, JSON.stringify(value));
      logger.info({ key, ttl }, "Cache SET");
    } catch (error) {
      logger.error({ error }, "Cache set error");
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }
}

export const cacheService = new CacheService();

import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../config/logger";

class RedisService {
  private client: Redis | null = null;

  constructor() {
    if (!config.redis.url) {
      logger.warn("REDIS_URL not configured. Redis service will be unavailable.");
      return;
    }

    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on("connect", () => logger.info("Redis connected"));
    this.client.on("error", (err) => logger.error({ err }, "Redis connection error"));
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (!this.client) return;
    if (expirySeconds) {
      await this.client.set(key, value, "EX", expirySeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }
}

export const redisService = new RedisService();

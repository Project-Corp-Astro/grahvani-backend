import { createClient, RedisClientType } from "redis";
import { logger } from "./logger";

let redisClient: RedisClientType | null = null;

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = createClient({ url });

    redisClient.on("error", (err) => logger.error({ err }, "Redis client error"));
    redisClient.on("connect", () => logger.info("Redis client connected"));

    redisClient.connect().catch((err) => logger.error({ err }, "Redis connect failed"));
  }
  return redisClient;
};

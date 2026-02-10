import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = createClient({ url });

    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    redisClient.on("connect", () => console.log("Redis Client Connected"));

    redisClient.connect().catch(console.error);
  }
  return redisClient;
};

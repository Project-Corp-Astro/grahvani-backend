// Redis Client Configuration
import Redis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis(config.redis.url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times: number) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redisClient.on('connect', () => {
            logger.info('Redis connected');
        });

        redisClient.on('error', (err: Error) => {
            logger.error({ err }, 'Redis connection error');
        });
    }
    return redisClient;
}

export async function closeRedis(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}

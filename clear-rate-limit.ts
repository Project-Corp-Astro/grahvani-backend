import { getRedisClient } from './services/auth-service/src/config/redis.js';

async function clearRateLimit(email: string) {
    const redis = getRedisClient();
    try {
        const pattern = `login_attempts:${email}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            console.log(`Found keys to delete: ${keys.join(', ')}`);
            await redis.del(...keys);
            console.log('Keys deleted.');
        } else {
            console.log('No rate limit keys found for this email.');
        }
    } catch (error) {
        console.error('Redis error:', error);
    } finally {
        await redis.quit();
    }
}

const email = process.argv[2] || 'naveenmotika143@gmail.com';
clearRateLimit(email);

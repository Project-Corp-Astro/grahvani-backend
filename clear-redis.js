const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

async function clearRateLimits() {
    try {
        const keys = await redis.keys('*login_attempts*');
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`Cleared ${keys.length} keys.`);
        } else {
            console.log('No keys found.');
        }
    } catch (error) {
        console.error('Error clearing redis keys:', error);
    } finally {
        redis.quit();
    }
}

clearRateLimits();

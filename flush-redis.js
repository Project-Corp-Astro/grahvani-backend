const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

async function flushAll() {
    try {
        const result = await redis.flushall();
        console.log('Result of FLUSHALL:', result);
    } catch (error) {
        console.error('Error flushing redis:', error);
    } finally {
        redis.quit();
    }
}

flushAll();

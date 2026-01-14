const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

async function listAllKeys() {
    try {
        const keys = await redis.keys('*');
        console.log('All keys in Redis:', keys);
    } catch (error) {
        console.error('Error listing redis keys:', error);
    } finally {
        redis.quit();
    }
}

listAllKeys();

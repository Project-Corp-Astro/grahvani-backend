
import { createClient } from 'redis';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function verifyRedis() {
    console.log('Connecting to Redis...');
    const publisher = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    const subscriber = publisher.duplicate();

    await publisher.connect();
    await subscriber.connect();

    // Create a dummy user to satisfy FK
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    console.log('Upserting test user to satisfy FK key...');
    await prisma.user.upsert({
        where: { id: testUserId },
        create: {
            id: testUserId,
            email: 'test-log-user@example.com',
            name: 'Test Log User',
            tenantId: '00000000-0000-0000-0000-000000000000',
            role: 'user',
            status: 'active'
        },
        update: {}
    });

    console.log('Connected. Subscribing to grahvani:events:auth...');

    await subscriber.subscribe('grahvani:events:auth', (message) => {
        console.log('✅ RECEIVED EVENT:', message);
        process.exit(0);
    });

    console.log('Publishing test event...');
    const testEvent = {
        type: 'user.login',
        data: {
            userId: testUserId,
            sessionId: 'test-session-id',
            metadata: {
                ipAddress: '127.0.0.1',
                userAgent: 'Test Script'
            }
        },
        timestamp: new Date().toISOString()
    };

    await publisher.publish('grahvani:events:auth', JSON.stringify(testEvent));
    console.log('Event published. Waiting for receipt...');

    setTimeout(() => {
        console.log('❌ Timeout: Event not received within 5 seconds.');
        process.exit(1);
    }, 5000);
}

verifyRedis().catch(console.error);

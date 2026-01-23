// IMPORTANT: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Root .env
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true }); // Service .env

process.env.TZ = 'Asia/Kolkata';

// Now import app after env vars are loaded
import app from './app';
import { eventSubscriber } from './events/subscriber';

const PORT = process.env.PORT || 3002;

// Start the HTTP server
app.listen(PORT, async () => {
    console.log(`[User Service] Listening on port ${PORT}`);

    // Start event subscriber for Auth Service events
    try {
        await eventSubscriber.start();
        console.log('[User Service] Event subscriber started');
    } catch (error) {
        console.error('[User Service] Failed to start event subscriber:', error);
        // Service continues without event sync (degraded mode)
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[User Service] Shutting down...');
    await eventSubscriber.stop();
    process.exit(0);
});

process.env.TZ = 'Asia/Kolkata';
import app from './app';
import { config } from './config';
import { logger } from './config/logger';

const PORT = config.port;

app.listen(PORT, () => {
    logger.info(`🌟 Astro Engine Proxy running on port ${PORT}`);
    logger.info(`   - Internal API: /internal/*`);
    logger.info(`   - Health: /health`);
    logger.info(`   - External API: ${config.astroEngineUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

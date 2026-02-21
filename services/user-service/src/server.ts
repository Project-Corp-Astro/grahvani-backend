// IMPORTANT: Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // Root .env
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true }); // Service .env

process.env.TZ = "Asia/Kolkata";

// Now import app after env vars are loaded
import app from "./app";
import { eventSubscriber } from "./events/subscriber";
import { logger } from "./config/logger";

const PORT = process.env.PORT || 3002;

// Start the HTTP server
app.listen(PORT, async () => {
  logger.info({ port: PORT }, "User Service started");

  // Start event subscriber for Auth Service events
  try {
    await eventSubscriber.start();
    logger.info("Event subscriber started");
  } catch (error) {
    logger.error({ err: error }, "Failed to start event subscriber");
    // Service continues without event sync (degraded mode)
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down");
  await eventSubscriber.stop();
  process.exit(0);
});

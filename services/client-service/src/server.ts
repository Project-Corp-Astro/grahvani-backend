process.env.TZ = "Asia/Kolkata";
import dotenv from "dotenv";
import path from "path";

// Load environment variables BEFORE importing app
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // Root .env
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true }); // Service .env

import app from "./app";
import { chartService } from "./services/chart.service";
import { logger } from "./config/logger";

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Client Service started");

  // Startup Recovery: Resume any interrupted chart generations
  // Small delay to ensure DB connection is warm
  setTimeout(() => {
    chartService.resumeInterruptedGenerations().catch((err) => {
      logger.error({ err }, "Startup recovery failed");
    });
  }, 1000);
});

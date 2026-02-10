process.env.TZ = "Asia/Kolkata";
import dotenv from "dotenv";
import path from "path";

// Load environment variables BEFORE importing app
dotenv.config({ path: path.resolve(__dirname, "../../../.env") }); // Root .env
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true }); // Service .env

import app from "./app";
import { chartService } from "./services/chart.service";

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  console.log(`[Client Service] Listening on port ${PORT}`);

  // Startup Recovery: Resume any interrupted chart generations
  // Small delay to ensure DB connection is warm
  setTimeout(() => {
    chartService.resumeInterruptedGenerations().catch((err) => {
      console.error("[Startup] Recovery failed:", err);
    });
  }, 1000);
});

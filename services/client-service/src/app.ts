import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import compression from "compression"; // Optimized: GZIP
import rateLimit from "express-rate-limit"; // Security: Rate Limiting

import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { getDatabaseManager } from "./config/db-pro";

const app: Express = express();

// Initialize Database Manager
getDatabaseManager();
console.log("✅ Database manager initialized (Standardized Port 6543)");

// Trust proxy configuration for Rate Limiting
// Dev: false (Direct access, no proxy) | Prod: 1 (Behind single Reverse Proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

// Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window (High due to heavy polling nature)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests, please try again later.",
    },
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression()); // Optimized: Reduce JSON payload size
app.use(limiter); // Apply rate limiting to all requests
app.use(express.json());
app.use(pino());

// API Routes
app.use("/api/v1", routes);

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Client Service API" });
});

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "client-service" });
});

// Error Handling
app.use(errorMiddleware);

export default app;

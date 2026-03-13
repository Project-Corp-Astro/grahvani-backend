// Configuration for Admin Service
import { z } from "zod";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
  dotenv.config({
    path: path.resolve(__dirname, "../../.env"),
    override: true,
  });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("3010"),
  DATABASE_URL: z
    .string()
    .default(process.env.NODE_ENV === "test" ? "postgresql://mock:mock@localhost:5432/mock" : ""),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z
    .string()
    .min(32)
    .default(process.env.NODE_ENV === "test" ? "mock-secret-at-least-32-chars-long" : ""),
  INTERNAL_SERVICE_KEY: z.string().optional(),
  AUTH_SERVICE_URL: z.string().default("http://localhost:3001"),
  USER_SERVICE_URL: z.string().default("http://localhost:3002"),
  CLIENT_SERVICE_URL: z.string().default("http://localhost:3008"),
  MEDIA_SERVICE_URL: z.string().default("http://localhost:3007"),
  SLACK_SERVICE_URL: z.string().default("http://localhost:3016"),
  ASTRO_ENGINE_URL: z.string().default("http://localhost:3014"),
  ASTRO_ENGINE_CORE_URL: z.string().default("https://astroengine.astrocorp.in"),
  GATEWAY_URL: z.string().default("http://localhost:8080"),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  database: { url: env.DATABASE_URL },
  redis: { url: env.REDIS_URL },
  jwt: { secret: env.JWT_SECRET },
  internal: { serviceKey: env.INTERNAL_SERVICE_KEY },
  services: {
    auth: env.AUTH_SERVICE_URL,
    user: env.USER_SERVICE_URL,
    client: env.CLIENT_SERVICE_URL,
    media: env.MEDIA_SERVICE_URL,
    slack: env.SLACK_SERVICE_URL,
    astroProxy: env.ASTRO_ENGINE_URL,
    astroCore: env.ASTRO_ENGINE_CORE_URL,
    gateway: env.GATEWAY_URL,
  },
};

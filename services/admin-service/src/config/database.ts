// Database Configuration - Prisma Client
import { PrismaClient } from "../generated/prisma";
import { logger } from "./logger";

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? [
              { level: "query", emit: "event" },
              { level: "error", emit: "stdout" },
            ]
          : [{ level: "error", emit: "stdout" }],
    });
    logger.info("✅ Admin Prisma Client initialized");
  }
  return prisma;
}

export { prisma };

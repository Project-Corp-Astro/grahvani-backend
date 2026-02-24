import { createDatabaseManager } from "@grahvani/contracts";
import { PrismaClient } from "../generated/prisma";
import { logger } from "./logger";

export const { getDatabaseManager, getPrismaClient, getDBMetrics, performHealthCheck } =
  createDatabaseManager({
    serviceName: "media-service",
    databaseUrlEnvKey: "MEDIA_DATABASE_URL",
    PrismaClientClass: PrismaClient as any,
    logger,
  });

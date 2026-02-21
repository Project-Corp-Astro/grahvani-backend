import { createAuthMiddleware } from "@grahvani/contracts";
import { getRedisClient } from "../config/redis";

// Re-export AuthRequest type from contracts for use across the service
export type { AuthRequest } from "@grahvani/contracts";

export const authMiddleware = createAuthMiddleware({
  getRedisClient: () => getRedisClient() as any,
  checkBlacklist: false,
});

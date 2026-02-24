import { createAuthMiddleware, AuthRequest } from "@grahvani/contracts";
import { getRedisClient } from "../config/redis";

export const authMiddleware = createAuthMiddleware({
    getRedisClient: () => getRedisClient() as any,
    checkBlacklist: true,
});

// Re-export AuthRequest for use in controllers
export type { AuthRequest };

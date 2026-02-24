// Enhanced Token Service - Enterprise Grade
// Designed for API Gateway integration and service-to-service authentication
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getRedisClient } from "../config/redis";
import { config } from "../config";
import { logger } from "../config/logger";

// ============ TOKEN TYPES ============

export interface AccessTokenPayload {
  // Standard JWT claims
  sub: string; // User ID
  iss: string; // Issuer (auth-service)
  aud: string; // Audience (grahvani-api)
  iat: number; // Issued at
  exp: number; // Expiration

  // User claims
  email: string;
  role: "user" | "admin" | "moderator" | "superadmin";
  tenantId: string;

  // Session claims
  sessionId: string;
  deviceId?: string;

  // Permissions (for API Gateway)
  permissions: string[];

  // Token metadata
  tokenType: "access";
  version: number; // For token invalidation
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  family: string; // For rotation detection
  iat: number;
  exp: number;
  tokenType: "refresh";
}

export interface ServiceTokenPayload {
  sub: string; // Service name
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  tokenType: "service";
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExp: Date;
  refreshTokenExp: Date;
}

// ============ ROLE PERMISSIONS MAP ============

const ROLE_PERMISSIONS: Record<string, string[]> = {
  user: [
    "read:profile",
    "write:profile",
    "read:clients",
    "write:clients",
    "read:bookings",
    "write:bookings",
    "read:reports",
    "write:reports",
  ],
  admin: [
    "read:profile",
    "write:profile",
    "read:clients",
    "write:clients",
    "read:bookings",
    "write:bookings",
    "read:reports",
    "write:reports",
    "admin:users",
    "admin:content",
  ],
  moderator: ["read:profile", "write:profile", "moderate:content", "moderate:users"],
  superadmin: [
    "*", // All permissions
  ],
};

// ============ TOKEN SERVICE ============

export class TokenService {
  private redis = getRedisClient();

  // Use environment or generate keys for development
  private readonly accessSecret = config.jwt.secret;
  private readonly refreshSecret = config.jwt.refreshSecret;
  private readonly issuer = "grahvani-auth-service";
  private readonly audience = "grahvani-api";

  /**
   * Generate access and refresh token pair for authenticated user
   */
  async generateTokenPair(
    user: {
      id: string;
      email: string;
      role: string;
      tenantId?: string;
    },
    sessionId: string,
    rememberMe: boolean = false,
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);

    // Get permissions for role
    const permissions = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.user;

    // Get token version (for invalidation)
    const tokenVersion = await this.getTokenVersion(user.id);

    // ===== ACCESS TOKEN (15 min) =====
    const accessTokenExp = now + 15 * 60;
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      iss: this.issuer,
      aud: this.audience,
      iat: now,
      exp: accessTokenExp,
      email: user.email,
      role: user.role as any,
      tenantId: user.tenantId || "default",
      sessionId,
      permissions,
      tokenType: "access",
      version: tokenVersion,
    };

    const accessToken = jwt.sign(accessPayload, this.accessSecret, {
      algorithm: "HS256",
    });

    // ===== REFRESH TOKEN (7 or 30 days) =====
    const refreshExpSeconds = rememberMe
      ? 30 * 24 * 60 * 60 // 30 days
      : 7 * 24 * 60 * 60; // 7 days
    const refreshTokenExp = now + refreshExpSeconds;

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      family: crypto.randomUUID(),
      iat: now,
      exp: refreshTokenExp,
      tokenType: "refresh",
    };

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, {
      algorithm: "HS256",
    });

    // Store token family in Redis for rotation detection
    await this.redis.setex(`token_family:${sessionId}`, refreshExpSeconds, refreshPayload.family);

    logger.debug({ userId: user.id, sessionId }, "Token pair generated");

    return {
      accessToken,
      refreshToken,
      accessTokenExp: new Date(accessTokenExp * 1000),
      refreshTokenExp: new Date(refreshTokenExp * 1000),
    };
  }

  /**
   * Generate service-to-service token for internal API calls
   * Used by API Gateway and other services
   */
  async generateServiceToken(
    serviceName: string,
    permissions: string[] = ["read:*"],
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60; // 1 hour

    const payload: ServiceTokenPayload = {
      sub: serviceName,
      iss: this.issuer,
      aud: this.audience,
      iat: now,
      exp,
      tokenType: "service",
      permissions,
    };

    return jwt.sign(payload, this.accessSecret, { algorithm: "HS256" });
  }

  /**
   * Verify access token - called by API Gateway
   * Returns decoded payload if valid
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        algorithms: ["HS256"],
        issuer: this.issuer,
        audience: this.audience,
      }) as AccessTokenPayload;

      // Check token type
      if (payload.tokenType !== "access") {
        throw new Error("Invalid token type");
      }

      // Check if token is blacklisted
      if (await this.isBlacklisted(token)) {
        throw new Error("Token is blacklisted");
      }

      // Check token version (for force logout)
      const currentVersion = await this.getTokenVersion(payload.sub);
      if (payload.version < currentVersion) {
        throw new Error("Token version invalidated");
      }

      return payload;
    } catch (error: any) {
      logger.debug({ error: error.message }, "Access token verification failed");
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Introspect token - RFC 7662 compliant endpoint for API Gateway
   * Returns token metadata without requiring the secret
   */
  async introspectToken(token: string): Promise<{
    active: boolean;
    sub?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    exp?: number;
    iat?: number;
    scope?: string;
  }> {
    try {
      const payload = await this.verifyAccessToken(token);

      return {
        active: true,
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        exp: payload.exp,
        iat: payload.iat,
        scope: payload.permissions.join(" "),
      };
    } catch {
      return { active: false };
    }
  }

  /**
   * Verify refresh token and check for reuse
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        algorithms: ["HS256"],
      }) as RefreshTokenPayload;

      // Validate token type
      if (payload.tokenType !== "refresh") {
        throw new Error("Invalid token type");
      }

      // Check token family for rotation detection
      const storedFamily = await this.redis.get(`token_family:${payload.sessionId}`);
      if (storedFamily !== payload.family) {
        // Token reuse detected - revoke all tokens for this user
        logger.warn({ sessionId: payload.sessionId }, "Refresh token reuse detected");
        await this.invalidateAllUserTokens(payload.sub);
        throw new Error("Token reuse detected - all sessions invalidated");
      }

      return payload;
    } catch (error: any) {
      logger.debug({ error: error.message }, "Refresh token verification failed");
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Blacklist a token (after logout)
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return;

      const hash = this.hashToken(token);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      if (ttl > 0) {
        await this.redis.setex(`blacklist:${hash}`, ttl, "1");
        logger.debug("Token blacklisted");
      }
    } catch (error) {
      logger.error({ error }, "Failed to blacklist token");
    }
  }

  /**
   * Invalidate all tokens for a user (force logout all devices)
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    const key = `token_version:${userId}`;
    await this.redis.incr(key);
    logger.info({ userId }, "All user tokens invalidated");
  }

  /**
   * Check if token is blacklisted
   */
  private async isBlacklisted(token: string): Promise<boolean> {
    const hash = this.hashToken(token);
    const result = await this.redis.get(`blacklist:${hash}`);
    return result === "1";
  }

  /**
   * Get current token version for user
   */
  private async getTokenVersion(userId: string): Promise<number> {
    const version = await this.redis.get(`token_version:${userId}`);
    return version ? parseInt(version, 10) : 0;
  }

  /**
   * Hash token for storage (don't store raw tokens)
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

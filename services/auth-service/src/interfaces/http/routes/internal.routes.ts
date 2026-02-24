// Internal Routes - For API Gateway and Service-to-Service Communication
import { Router, Request, Response, NextFunction } from "express";
import { TokenService } from "../../../services/token.service";
import { logger } from "../../../config/logger";

const router = Router();
const tokenService = new TokenService();

/**
 * POST /internal/token/introspect
 * RFC 7662 Token Introspection Endpoint
 * Called by API Gateway to validate tokens
 */
router.post("/token/introspect", async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ active: false, error: "Token is required" });
    }

    const result = await tokenService.introspectToken(token);
    res.json(result);
  } catch (error) {
    logger.error({ error }, "Token introspection failed");
    res.json({ active: false });
  }
});

/**
 * POST /internal/token/validate
 * Fast token validation for services
 * Returns user context if valid
 */
router.post("/token/validate", async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || req.body.token;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        valid: false,
        error: { code: "MISSING_TOKEN", message: "Token is required" },
      });
    }

    const payload = await tokenService.verifyAccessToken(token);

    res.json({
      valid: true,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        permissions: payload.permissions,
      },
      session: {
        id: payload.sessionId,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      valid: false,
      error: { code: "INVALID_TOKEN", message: error.message },
    });
  }
});

/**
 * POST /internal/token/service
 * Generate service-to-service token
 * Only accessible by other authenticated services
 */
router.post("/token/service", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify requesting service (via API key or mTLS in production)
    const serviceKey = req.headers["x-service-key"];

    if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Invalid service key" },
      });
    }

    const { serviceName, permissions } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "serviceName is required",
        },
      });
    }

    const token = await tokenService.generateServiceToken(serviceName, permissions);

    res.json({
      token,
      tokenType: "Bearer",
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/token/revoke-all
 * Force logout all sessions for a user
 * Called when password changes or security event
 */
router.post("/token/revoke-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceKey = req.headers["x-service-key"];

    if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Invalid service key" },
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: { code: "INVALID_REQUEST", message: "userId is required" },
      });
    }

    await tokenService.invalidateAllUserTokens(userId);

    logger.info({ userId }, "All tokens revoked via internal API");

    res.json({ success: true, message: "All tokens revoked" });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/health
 * Health check for service discovery
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ============ PROVISIONING ROUTES (Managed Onboarding) ============

import { ProvisioningService, ProvisionInput } from "../../../services/provision.service";

const provisioningService = new ProvisioningService();

/**
 * POST /internal/provision
 * Create a new user account (SAP-initiated)
 * Implements the Invitation Pattern for secure onboarding
 */
router.post("/provision", async (req: Request, res: Response, _next: NextFunction) => {
  try {
    // Verify service key for security
    const serviceKey = req.headers["x-service-key"];
    if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Invalid service key" },
      });
    }

    const { email, name, tenantId, role, features } = req.body as ProvisionInput;

    // Validate required fields
    if (!email || !name || !tenantId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["email", "name", "tenantId"],
      });
    }

    const result = await provisioningService.provision({
      email,
      name,
      tenantId,
      role,
      features,
    });

    logger.info({ userId: result.userId, tenantId }, "User provisioned via internal API");

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    logger.error({ error }, "Provisioning failed");
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /internal/resend-invitation
 * Resend invitation email for a pending user
 */
router.post("/resend-invitation", async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const serviceKey = req.headers["x-service-key"];
    if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Invalid service key" },
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await provisioningService.resendInvitation(email);

    res.status(200).json({
      success: true,
      message: "Invitation resent successfully",
      expiresAt: result.expiresAt,
    });
  } catch (error: unknown) {
    logger.error({ error }, "Resend invitation failed");
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(400).json({ error: message });
  }
});

export { router as internalRoutes };

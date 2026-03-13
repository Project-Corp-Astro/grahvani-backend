import { Router, Request, Response } from "express";
import { featurePolicyService } from "../services/feature-policy.service";
import { config } from "../config";
import { logger } from "../config/logger";

const router = Router();

/**
 * Internal middleware to verify service-to-service communication key
 */
const verifyInternalKey = (req: Request, res: Response, next: any) => {
  const key = req.headers["x-internal-key"];
  if (key !== config.internal.serviceKey) {
    logger.warn({ path: req.path }, "Unauthorized internal request attempt");
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
};

/**
 * GET /internal/capabilities/:userId
 * Resolves or fetches capabilities from cache/DB for a specific user.
 */
router.get("/capabilities/:userId", verifyInternalKey, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const capabilities = await featurePolicyService.resolveUserCapabilities(userId);

    if (!capabilities) {
      return res.status(404).json({
        success: false,
        error: "Active subscription not found for user",
      });
    }

    res.json({ success: true, data: capabilities });
  } catch (err) {
    logger.error({ err }, "Internal capability resolution failed");
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

export default router;

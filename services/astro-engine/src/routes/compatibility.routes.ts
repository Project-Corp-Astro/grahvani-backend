import { Router } from "express";
import { compatibilityController } from "../controllers/compatibility.controller";

const router = Router();

// =============================================================================
// COMPATIBILITY & RELATIONSHIP ROUTES
// Synastry, Composite, and Progressed charts for relationship analysis
// =============================================================================

// Synastry (chart comparison)
router.post(
  "/synastry",
  compatibilityController.getSynastry.bind(compatibilityController),
);

// Composite (midpoint chart)
router.post(
  "/composite",
  compatibilityController.getComposite.bind(compatibilityController),
);

// Progressed (secondary progressions)
router.post(
  "/progressed",
  compatibilityController.getProgressed.bind(compatibilityController),
);

// Western-specific endpoints
router.post(
  "/western/synastry",
  compatibilityController.getWesternSynastry.bind(compatibilityController),
);
router.post(
  "/western/composite",
  compatibilityController.getWesternComposite.bind(compatibilityController),
);
router.post(
  "/western/progressed",
  compatibilityController.getWesternProgressed.bind(compatibilityController),
);

export default router;

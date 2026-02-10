import { Router } from "express";
import { numerologyController } from "../controllers/numerology.controller";

const router = Router();

// =============================================================================
// NUMEROLOGY ROUTES
// =============================================================================

// Chaldean Numerology
router.post(
  "/chaldean",
  numerologyController.getChaldeanNumerology.bind(numerologyController),
);

// Lo Shu Grid
router.post(
  "/loshu",
  numerologyController.getLoShuGrid.bind(numerologyController),
);

export default router;

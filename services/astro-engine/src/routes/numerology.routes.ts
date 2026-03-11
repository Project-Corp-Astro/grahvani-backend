import { Router } from "express";
import { numerologyController } from "../controllers/numerology.controller";

const router = Router();

// =============================================================================
// NUMEROLOGY ROUTES
// Note: Chaldean Numerology (168 endpoints) is registered separately
// at /api/numerology/chaldean/* via chaldean-numerology.routes.ts
// =============================================================================

// Lo Shu Grid
router.post("/loshu", numerologyController.getLoShuGrid.bind(numerologyController));

export default router;

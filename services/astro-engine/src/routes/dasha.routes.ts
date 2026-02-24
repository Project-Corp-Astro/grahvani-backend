import { Router } from "express";
import { vimshottariController } from "../controllers";

const router = Router();

// =============================================================================
// DASHA ROUTES
// =============================================================================

// Vimshottari Dasha (5 levels)
router.post("/vimshottari", vimshottariController.getDasha.bind(vimshottariController));
router.post("/prana", vimshottariController.getPranaDasha.bind(vimshottariController));

export default router;

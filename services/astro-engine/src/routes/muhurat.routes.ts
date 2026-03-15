import { Router } from "express";
import { muhuratController } from "../controllers/muhurat";

// =============================================================================
// MUHURAT ENGINE ROUTES
// All routes mounted under /api/muhurat in routes/index.ts
// =============================================================================

const router = Router();

// Core endpoints
router.post("/find", muhuratController.findMuhurats.bind(muhuratController));
router.post("/evaluate", muhuratController.evaluateDate.bind(muhuratController));
router.post("/compatibility", muhuratController.checkCompatibility.bind(muhuratController));
router.get("/event-types", muhuratController.getEventTypes.bind(muhuratController));
router.post("/interpret", muhuratController.getInterpretation.bind(muhuratController));

// Utility endpoints
router.get("/traditions", muhuratController.getTraditions.bind(muhuratController));
router.post("/panchang", muhuratController.getPanchang.bind(muhuratController));
router.post("/inauspicious-windows", muhuratController.getInauspiciousWindows.bind(muhuratController));
router.post("/time-quality", muhuratController.getTimeQuality.bind(muhuratController));

export default router;

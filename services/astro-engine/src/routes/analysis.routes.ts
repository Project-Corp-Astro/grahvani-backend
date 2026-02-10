import { Router } from "express";
import { analysisController } from "../controllers/analysis/analysis.controller";

const router = Router();

// Yogas
router.post("/yoga/:type", analysisController.getYoga.bind(analysisController));

// Doshas
router.post(
  "/dosha/:type",
  analysisController.getDosha.bind(analysisController),
);

// Remedies
router.post(
  "/remedies/:type",
  analysisController.getRemedies.bind(analysisController),
);

export default router;

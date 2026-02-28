import { Router } from "express";
import { bhasinController } from "../controllers/bhasin.controller";

const router = Router();

// Natal & Transit
router.post("/natal", bhasinController.getNatalChart.bind(bhasinController));
router.post("/transit", bhasinController.getTransitChart.bind(bhasinController));

// Divisional Charts
router.post("/divisional/:type", bhasinController.getDivisionalChart.bind(bhasinController));

// Dasha Systems
router.post("/dasha/:level", bhasinController.getDasha.bind(bhasinController));

// Ashtakavarga
router.post("/ashtakavarga/:type", bhasinController.getAshtakavarga.bind(bhasinController));

// Generic special charts (moon, sun, lagna charts, etc.)
router.post("/:type", bhasinController.getSpecialChart.bind(bhasinController));

export default router;

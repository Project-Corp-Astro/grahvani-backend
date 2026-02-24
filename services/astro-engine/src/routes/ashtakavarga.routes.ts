import { Router } from "express";
import { ashtakavargaController } from "../controllers";

const router = Router();

// =============================================================================
// ASHTAKAVARGA ROUTES
// =============================================================================

router.post("/bhinna", ashtakavargaController.getBhinnaAshtakavarga.bind(ashtakavargaController));
router.post("/sarva", ashtakavargaController.getSarvaAshtakavarga.bind(ashtakavargaController));
router.post("/shodasha", ashtakavargaController.getShodashaVarga.bind(ashtakavargaController));

export default router;

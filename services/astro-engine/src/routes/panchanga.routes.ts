import { Router } from "express";
import { panchangaController } from "../controllers/panchanga/panchanga.controller";

const router = Router();

router.post("/", panchangaController.getPanchanga.bind(panchangaController));
router.post(
  "/choghadiya",
  panchangaController.getChoghadiya.bind(panchangaController),
);
router.post("/hora", panchangaController.getHora.bind(panchangaController));
router.post(
  "/lagna",
  panchangaController.getLagnaTimes.bind(panchangaController),
);
router.post(
  "/muhurat",
  panchangaController.getMuhurat.bind(panchangaController),
);

export default router;

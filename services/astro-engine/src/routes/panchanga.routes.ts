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
router.post(
  "/avakhada_chakra",
  panchangaController.getAvakhadaChakra.bind(panchangaController),
);
router.post(
  "/tatkalik_maitri_chakra",
  panchangaController.getTatkalikMaitriChakra.bind(panchangaController),
);
router.post(
  "/gl_chart",
  panchangaController.getGlChart.bind(panchangaController),
);
router.post(
  "/karaka_strength",
  panchangaController.getKarakaStrength.bind(panchangaController),
);

export default router;

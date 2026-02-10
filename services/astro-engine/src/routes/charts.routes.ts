import { Router } from "express";
import {
  natalController,
  divisionalController,
  specialChartsController,
} from "../controllers";

const router = Router();

// =============================================================================
// CHARTS ROUTES
// =============================================================================

// Natal Chart (D1)
router.post("/natal", natalController.getNatalChart.bind(natalController));

// Divisional Charts (D2-D60)
router.post(
  "/divisional/:type",
  divisionalController.getDivisionalChart.bind(divisionalController),
);
router.post(
  "/navamsa",
  divisionalController.getNavamsa.bind(divisionalController),
); // Convenience
router.post(
  "/dasamsa",
  divisionalController.getDasamsa.bind(divisionalController),
); // Convenience

// Special Charts
router.post(
  "/transit",
  specialChartsController.getTransitChart.bind(specialChartsController),
);
router.post(
  "/moon",
  specialChartsController.getMoonChart.bind(specialChartsController),
);
router.post(
  "/sun",
  specialChartsController.getSunChart.bind(specialChartsController),
);
router.post(
  "/sudarshan-chakra",
  specialChartsController.getSudarshanChakra.bind(specialChartsController),
);

// Special Lagnas & Bhavas
router.post(
  "/arudha-lagna",
  specialChartsController.getArudhaLagna.bind(specialChartsController),
);
router.post(
  "/bhava-lagna",
  specialChartsController.getBhavaLagna.bind(specialChartsController),
);
router.post(
  "/hora-lagna",
  specialChartsController.getHoraLagna.bind(specialChartsController),
);
router.post(
  "/sripathi-bhava",
  specialChartsController.getSripathiBhava.bind(specialChartsController),
);
router.post(
  "/kp-bhava",
  specialChartsController.getKpBhava.bind(specialChartsController),
);
router.post(
  "/equal-bhava",
  specialChartsController.getEqualBhava.bind(specialChartsController),
);
router.post(
  "/karkamsha-d1",
  specialChartsController.getKarkamshaD1.bind(specialChartsController),
);
router.post(
  "/karkamsha-d9",
  specialChartsController.getKarkamshaD9.bind(specialChartsController),
);
router.post(
  "/mandi",
  specialChartsController.getMandi.bind(specialChartsController),
);
router.post(
  "/gulika",
  specialChartsController.getGulika.bind(specialChartsController),
);
router.post(
  "/shodasha-varga",
  specialChartsController.getShodashaVarga.bind(specialChartsController),
);

export default router;

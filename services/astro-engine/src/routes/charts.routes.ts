import { Router } from "express";
import { natalController, divisionalController, specialChartsController } from "../controllers";

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
router.post("/navamsa", divisionalController.getNavamsa.bind(divisionalController)); // Convenience
router.post("/dasamsa", divisionalController.getDasamsa.bind(divisionalController)); // Convenience

// Special Charts
router.post("/transit", specialChartsController.getTransitChart.bind(specialChartsController));

// NEW: Daily transit — Lahiri-only, dynamic date range
router.post(
  "/daily-transit",
  specialChartsController.getDailyTransit.bind(specialChartsController),
);
router.post("/moon", specialChartsController.getMoonChart.bind(specialChartsController));
router.post("/sun", specialChartsController.getSunChart.bind(specialChartsController));
router.post(
  "/sudarshan-chakra",
  specialChartsController.getSudarshanChakra.bind(specialChartsController),
);

// Special Lagnas & Bhavas
router.post("/arudha-lagna", specialChartsController.getArudhaLagna.bind(specialChartsController));
router.post("/bhava-lagna", specialChartsController.getBhavaLagna.bind(specialChartsController));
router.post("/hora-lagna", specialChartsController.getHoraLagna.bind(specialChartsController));
router.post(
  "/sripathi-bhava",
  specialChartsController.getSripathiBhava.bind(specialChartsController),
);
router.post("/kp-bhava", specialChartsController.getKpBhava.bind(specialChartsController));
router.post("/equal-bhava", specialChartsController.getEqualBhava.bind(specialChartsController));
router.post("/karkamsha-d1", specialChartsController.getKarkamshaD1.bind(specialChartsController));
router.post("/karkamsha-d9", specialChartsController.getKarkamshaD9.bind(specialChartsController));
router.post("/mandi", specialChartsController.getMandi.bind(specialChartsController));
router.post("/gulika", specialChartsController.getGulika.bind(specialChartsController));
router.post(
  "/upapada-lagna",
  specialChartsController.getUpapadaLagna.bind(specialChartsController),
);
router.post("/swamsha", specialChartsController.getSwamsha.bind(specialChartsController));
router.post(
  "/panchadha-maitri",
  specialChartsController.getPanchadhaMaitri.bind(specialChartsController),
);
router.post("/pada-chart", specialChartsController.getPadaChart.bind(specialChartsController));
router.post(
  "/shodasha-varga",
  specialChartsController.getShodashaVarga.bind(specialChartsController),
);

// Specialized Divisional Charts (Lahiri-only)
router.post("/d2-somanatha", specialChartsController.getD2Somanatha.bind(specialChartsController));
router.post("/d2-kashinatha", specialChartsController.getD2Kashinatha.bind(specialChartsController));
router.post("/d4-vedamsha", specialChartsController.getD4Vedamsha.bind(specialChartsController));
router.post("/d6-kaulaka", specialChartsController.getD6Kaulaka.bind(specialChartsController));
router.post("/d9-nadhi", specialChartsController.getD9Nadhi.bind(specialChartsController));
router.post("/d9-pada", specialChartsController.getD9Pada.bind(specialChartsController));
router.post("/d9-somanatha", specialChartsController.getD9Somanatha.bind(specialChartsController));
router.post("/d24-parasidamsha", specialChartsController.getD24Parasidamsha.bind(specialChartsController));
router.post("/d24-siddhamsha", specialChartsController.getD24Siddhamsha.bind(specialChartsController));
router.post("/d30-venkatesha", specialChartsController.getD30Venkatesha.bind(specialChartsController));
router.post("/d108-nd", specialChartsController.getD108ND.bind(specialChartsController));
router.post("/d108-dn", specialChartsController.getD108DN.bind(specialChartsController));
router.post("/d2-iyer", specialChartsController.getD2Iyer.bind(specialChartsController));
router.post("/d5", specialChartsController.getD5.bind(specialChartsController));
router.post("/d8-chart", specialChartsController.getD8Chart.bind(specialChartsController));
router.post("/d11", specialChartsController.getD11.bind(specialChartsController));

export default router;

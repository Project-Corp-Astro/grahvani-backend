import { Router } from "express";
import { kpPlanetsCuspsController, kpHoraryController } from "../controllers";

const router = Router();

// =============================================================================
// KP SYSTEM ROUTES
// =============================================================================

// Planets & Cusps
router.post(
  "/planets-cusps",
  kpPlanetsCuspsController.getPlanetsCusps.bind(kpPlanetsCuspsController),
);
router.post(
  "/ruling-planets",
  kpPlanetsCuspsController.getRulingPlanets.bind(kpPlanetsCuspsController),
);
router.post(
  "/bhava-details",
  kpPlanetsCuspsController.getBhavaDetails.bind(kpPlanetsCuspsController),
);
router.post(
  "/significations",
  kpPlanetsCuspsController.getSignifications.bind(kpPlanetsCuspsController),
);
router.post(
  "/house-significations",
  kpPlanetsCuspsController.getKpHouseSignifications.bind(kpPlanetsCuspsController),
);
router.post(
  "/planet-significators",
  kpPlanetsCuspsController.getKpPlanetSignificators.bind(kpPlanetsCuspsController),
);
router.post("/interlinks", kpPlanetsCuspsController.getKpInterlinks.bind(kpPlanetsCuspsController));
router.post(
  "/interlinks-advanced",
  kpPlanetsCuspsController.getKpAdvancedInterlinks.bind(kpPlanetsCuspsController),
);
router.post(
  "/interlinks-sl",
  kpPlanetsCuspsController.getKpInterlinksSL.bind(kpPlanetsCuspsController),
);
router.post(
  "/nakshatra-nadi",
  kpPlanetsCuspsController.getKpNakshatraNadi.bind(kpPlanetsCuspsController),
);
router.post("/fortuna", kpPlanetsCuspsController.getKpFortuna.bind(kpPlanetsCuspsController));
router.post(
  "/shodasha_varga_signs",
  kpPlanetsCuspsController.getShodashaVargaSummary.bind(kpPlanetsCuspsController),
);

// Horary
router.post("/horary", kpHoraryController.getHorary.bind(kpHoraryController));

export default router;

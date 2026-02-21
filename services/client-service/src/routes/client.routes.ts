import { Router } from "express";
import { clientController } from "../controllers/client.controller";
import { familyController } from "../controllers/family.controller";
import { historyController } from "../controllers/history.controller";
import { chartController } from "../controllers/chart.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { validateBody } from "@grahvani/contracts";
import {
  CreateClientSchema,
  UpdateClientSchema,
  FamilyLinkSchema,
} from "../validators/client.validator";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware); // Strict tenant enforcement

router.get("/", clientController.getClients.bind(clientController));
router.post(
  "/",
  validateBody(CreateClientSchema),
  clientController.createClient.bind(clientController),
);
router.get("/:id", clientController.getClient.bind(clientController));
router.patch(
  "/:id",
  validateBody(UpdateClientSchema),
  clientController.updateClient.bind(clientController),
);
router.delete("/:id", clientController.deleteClient.bind(clientController));

// Family Relationships
router.post(
  "/:id/family-link",
  validateBody(FamilyLinkSchema),
  familyController.linkFamilyMember.bind(familyController),
);
router.get(
  "/:id/family",
  familyController.getFamilyLinks.bind(familyController),
);
router.delete(
  "/:id/family/:relatedId",
  familyController.removeFamilyLink.bind(familyController),
);

// Consultation History
router.post(
  "/:id/history",
  historyController.addConsultation.bind(historyController),
);
router.get(
  "/:id/history",
  historyController.getHistory.bind(historyController),
);

// Saved Charts
router.post("/:id/charts", chartController.saveChart.bind(chartController));
router.get("/:id/charts", chartController.getCharts.bind(chartController));
router.delete(
  "/:id/charts/:chartId",
  chartController.deleteChart.bind(chartController),
);

// Chart Generation (via Astro Engine)
router.post(
  "/charts/generate-all",
  chartController.generateAllClientsCharts.bind(chartController),
);
router.post(
  "/:id/charts/generate",
  chartController.generateChart.bind(chartController),
);

// Yoga and Dosha Analysis
router.get(
  "/:id/yoga/:yogaType",
  chartController.getYogaAnalysis.bind(chartController),
);
router.get(
  "/:id/dosha/:doshaType",
  chartController.getDoshaAnalysis.bind(chartController),
);

// Yoga & Dosha Dashboard Routes (from dedicated client_yoga_doshas table)
router.get("/:id/yogas", chartController.getYogas.bind(chartController));
router.get("/:id/doshas", chartController.getDoshas.bind(chartController));
router.get(
  "/:id/yoga-dosha-summary",
  chartController.getYogaDoshaSummary.bind(chartController),
);

router.post(
  "/:id/charts/generate-core",
  chartController.generateCoreCharts.bind(chartController),
);
router.post(
  "/:id/charts/generate-full",
  chartController.generateFullVedicProfile.bind(chartController),
);

// Dasha Systems - Vimshottari (default) and Alternative Systems
router.post("/:id/dasha", chartController.generateDasha.bind(chartController));
router.post(
  "/:id/dasha/:system",
  chartController.generateAlternativeDasha.bind(chartController),
);

// Ashtakavarga
router.post(
  "/:id/ashtakavarga",
  chartController.generateAshtakavarga.bind(chartController),
);

// Sudarshan Chakra
router.post(
  "/:id/sudarshan-chakra",
  chartController.generateSudarshanChakra.bind(chartController),
);

// Raman Ayanamsa Specific Routes
router.post(
  "/:id/raman/natal",
  chartController.generateRamanNatal.bind(chartController),
);
router.post(
  "/:id/raman/transit",
  chartController.generateRamanTransit.bind(chartController),
);
router.post(
  "/:id/raman/divisional/:type",
  chartController.generateRamanDivisional.bind(chartController),
);
router.post(
  "/:id/raman/dasha/:level",
  chartController.generateRamanDasha.bind(chartController),
);
router.post(
  "/:id/raman/:type",
  chartController.generateRamanChart.bind(chartController),
);

// KP (Krishnamurti Paddhati) System Routes
router.post(
  "/:id/kp/planets-cusps",
  chartController.getKpPlanetsCusps.bind(chartController),
);
router.post(
  "/:id/kp/ruling-planets",
  chartController.getKpRulingPlanets.bind(chartController),
);
router.post(
  "/:id/kp/bhava-details",
  chartController.getKpBhavaDetails.bind(chartController),
);
router.post(
  "/:id/kp/significations",
  chartController.getKpSignifications.bind(chartController),
);
router.post(
  "/:id/kp/house-significations",
  chartController.getKpHouseSignifications.bind(chartController),
);
router.post(
  "/:id/kp/planets-significators",
  chartController.getKpPlanetSignificators.bind(chartController),
);
router.post(
  "/:id/kp/interlinks",
  chartController.getKpInterlinks.bind(chartController),
);
router.post(
  "/:id/kp/interlinks-advanced",
  chartController.getKpAdvancedInterlinks.bind(chartController),
);
router.post(
  "/:id/kp/nakshatra-nadi",
  chartController.getKpNakshatraNadi.bind(chartController),
);
router.post(
  "/:id/kp/fortuna",
  chartController.getKpFortuna.bind(chartController),
);
router.post(
  "/:id/kp/horary",
  chartController.getKpHorary.bind(chartController),
);

export default router;

import { Router } from "express";
import chartsRoutes from "./charts.routes";
import kpRoutes from "./kp.routes";
import dashaRoutes from "./dasha.routes";
import ashtakavargaRoutes from "./ashtakavarga.routes";
import ramanRoutes from "./raman.routes";
import bhasinRoutes from "./bhasin.routes";
import compatibilityRoutes from "./compatibility.routes";
import numerologyRoutes from "./numerology.routes";
import analysisRoutes from "./analysis.routes";
import panchangaRoutes from "./panchanga.routes";
import { panchangaController } from "../controllers/panchanga/panchanga.controller";

const router = Router();

// =============================================================================
// API ROUTES INDEX
// All routes are prefixed with /api in app.ts
// =============================================================================

// Charts: /api/charts/*
router.use("/charts", chartsRoutes);

// KP System: /api/kp/*
router.use("/kp", kpRoutes);

// Dasha: /api/dasha/*
router.use("/dasha", dashaRoutes);

// Ashtakavarga: /api/ashtakavarga/*
router.use("/ashtakavarga", ashtakavargaRoutes);

// Raman Ayanamsa System: /api/raman/*
router.use("/raman", ramanRoutes);

// Bhasin Ayanamsa System: /api/bhasin/*
router.use("/bhasin", bhasinRoutes);

// Compatibility & Relationship: /api/compatibility/*
router.use("/compatibility", compatibilityRoutes);

// Numerology: /api/numerology/*
router.use("/numerology", numerologyRoutes);

// Analysis (Yogas, Doshas, Remedies): /api/analysis/*
router.use("/analysis", analysisRoutes);

// Panchanga: /api/panchanga/*
router.use("/panchanga", panchangaRoutes);

// =============================================================================
// UNIVERSAL PANCHANGA ROUTES (root-level, matching Python engine endpoints)
// These are birth-date based and system-agnostic
// =============================================================================
router.post("/panchanga", panchangaController.getPanchanga.bind(panchangaController));
router.post("/choghadiya_times", panchangaController.getChoghadiya.bind(panchangaController));
router.post("/hora_times", panchangaController.getHora.bind(panchangaController));
router.post("/lagna_times", panchangaController.getLagnaTimes.bind(panchangaController));
router.post("/muhurat", panchangaController.getMuhurat.bind(panchangaController));
router.post("/avakhada_chakra", panchangaController.getAvakhadaChakra.bind(panchangaController));
router.post(
  "/tatkalik_maitri_chakra",
  panchangaController.getTatkalikMaitriChakra.bind(panchangaController),
);
router.post("/gl_chart", panchangaController.getGlChart.bind(panchangaController));
router.post("/karaka_strength", panchangaController.getKarakaStrength.bind(panchangaController));
router.post(
  "/pushkara-navamsha",
  panchangaController.getPushkaraNavamsha.bind(panchangaController),
);

export default router;

import { Router } from "express";
import { chaldeanController } from "../controllers/chaldean-numerology.controller";

const router = Router();

// =============================================================================
// CHALDEAN NUMEROLOGY ROUTES
// Prefix: /api/numerology/chaldean (registered in routes/index.ts)
// 75 service POST + 1 health GET + 1 dynamic raw POST (92 calculators)
// =============================================================================

const c = chaldeanController;

// ── Health ──
router.get("/health", c.health.bind(c));

// ── Naming (5) ──
router.post("/naming/baby-name-analyze", c.analyzeBabyName.bind(c));
router.post("/naming/baby-name-variations", c.getBabyNameVariations.bind(c));
router.post("/naming/baby-name-generate", c.generateBabyNames.bind(c));
router.post("/naming/personal-name-analyze", c.analyzePersonalName.bind(c));
router.post("/naming/name-change-analyze", c.analyzeNameChange.bind(c));

// ── Numbers (6) ──
router.post("/numbers/birth-number-analyze", c.analyzeBirthNumber.bind(c));
router.post("/numbers/mobile-analyze", c.analyzeMobileNumber.bind(c));
router.post("/numbers/vehicle-analyze", c.analyzeVehicleNumber.bind(c));
router.post("/numbers/house-analyze", c.analyzeHouseNumber.bind(c));
router.post("/numbers/bank-analyze", c.analyzeBankAccount.bind(c));
router.post("/numbers/pin-analyze", c.analyzePinPassword.bind(c));

// ── Relationships (10) ──
router.post("/relationships/love-compatibility", c.analyzeLoveCompatibility.bind(c));
router.post("/relationships/marriage-compatibility", c.analyzeMarriageCompatibility.bind(c));
router.post("/relationships/wedding-date-finder", c.findWeddingDates.bind(c));
router.post("/relationships/friendship-analyze", c.analyzeFriendship.bind(c));
router.post("/relationships/family-harmony", c.analyzeFamilyHarmony.bind(c));
router.post("/relationships/parent-child-analyze", c.analyzeParentChild.bind(c));
router.post("/relationships/sibling-dynamics", c.analyzeSiblingDynamics.bind(c));
router.post("/relationships/inlaw-compatibility", c.analyzeInLawCompatibility.bind(c));
router.post("/relationships/divorce-risk-analyze", c.analyzeDivorceRisk.bind(c));
router.post("/relationships/rekindle-romance", c.analyzeRekindleRomance.bind(c));

// ── Career (4) ──
router.post("/career/career-path", c.analyzeCareerPath.bind(c));
router.post("/career/job-change-timing", c.analyzeJobChangeTiming.bind(c));
router.post("/career/boss-compatibility", c.analyzeBossCompatibility.bind(c));
router.post("/career/team-compatibility", c.analyzeTeamCompatibility.bind(c));

// ── Timing (10) ──
router.post("/timing/daily-forecast", c.getDailyForecast.bind(c));
router.post("/timing/weekly-planner", c.getWeeklyPlanner.bind(c));
router.post("/timing/monthly-forecast", c.getMonthlyForecast.bind(c));
router.post("/timing/yearly-forecast", c.getYearlyForecast.bind(c));
router.post("/timing/best-date-finder", c.findBestDates.bind(c));
router.post("/timing/event-timing", c.analyzeEventTiming.bind(c));
router.post("/timing/lucky-hours", c.findLuckyHours.bind(c));
router.post("/timing/transit-day", c.analyzeTransitDay.bind(c));
router.post("/timing/personal-cycles", c.trackPersonalCycles.bind(c));
router.post("/timing/auspicious-moments", c.findAuspiciousMoments.bind(c));

// ── Business (12) ──
router.post("/business/name-analyze", c.analyzeBusinessName.bind(c));
router.post("/business/name-generate", c.generateBusinessNames.bind(c));
router.post("/business/tagline-analyze", c.analyzeTagline.bind(c));
router.post("/business/domain-analyze", c.analyzeDomain.bind(c));
router.post("/business/logo-colors", c.recommendLogoColors.bind(c));
router.post("/business/logo-colors/analyze", c.analyzeLogoColors.bind(c));
router.post("/business/partnership-compatibility", c.analyzePartnership.bind(c));
router.post("/business/brand-energy", c.analyzeBrandEnergy.bind(c));
router.post("/business/product-name", c.analyzeProductName.bind(c));
router.post("/business/store-location", c.analyzeStoreLocation.bind(c));
router.post("/business/card-analyze", c.analyzeBusinessCard.bind(c));
router.post("/business/email-generate", c.generateBusinessEmail.bind(c));

// ── Spiritual (6) ──
router.post("/spiritual/karmic-debt", c.analyzeKarmicDebt.bind(c));
router.post("/spiritual/life-lessons", c.analyzeLifeLessons.bind(c));
router.post("/spiritual/spiritual-guide", c.getSpiritualGuide.bind(c));
router.post("/spiritual/meditation", c.getMeditationGuidance.bind(c));
router.post("/spiritual/chakra-alignment", c.analyzeChakraAlignment.bind(c));
router.post("/spiritual/past-life", c.analyzePastLife.bind(c));

// ── Packages (11) ──
router.post("/packages/life-blueprint", c.getLifeBlueprint.bind(c));
router.post("/packages/new-parent", c.getNewParentPackage.bind(c));
router.post("/packages/entrepreneur", c.getEntrepreneurPackage.bind(c));
router.post("/packages/marriage", c.getMarriagePackage.bind(c));
router.post("/packages/career-transformation", c.getCareerTransformation.bind(c));
router.post("/packages/wealth-mastery", c.getWealthMastery.bind(c));
router.post("/packages/family-harmony", c.getFamilyHarmonyPackage.bind(c));
router.post("/packages/health-wellness", c.getHealthWellness.bind(c));
router.post("/packages/student-success", c.getStudentSuccess.bind(c));
router.post("/packages/real-estate", c.getRealEstatePackage.bind(c));
router.post("/packages/annual-fortune", c.getAnnualFortune.bind(c));

// ── Unique (8) ──
router.post("/unique/lucky-numbers", c.generateLuckyNumbers.bind(c));
router.post("/unique/signature-analyze", c.analyzeSignature.bind(c));
router.post("/unique/email-analyze", c.analyzeEmail.bind(c));
router.post("/unique/social-media-analyze", c.analyzeSocialMedia.bind(c));
router.post("/unique/password-optimize", c.optimizePassword.bind(c));
router.post("/unique/license-plate-find", c.findLicensePlate.bind(c));
router.post("/unique/lucky-colors", c.generateLuckyColors.bind(c));
router.post("/unique/compatibility-batch", c.analyzeCompatibilityBatch.bind(c));

// ── Daily (3) ──
router.post("/daily/lucky-color", c.getLuckyColorToday.bind(c));
router.post("/daily/energy-forecast", c.getEnergyForecast.bind(c));
router.post("/daily/emotional-balance", c.getEmotionalBalance.bind(c));

// ── Raw Calculators (92 endpoints via single dynamic route) ──
router.post("/raw/:slug", c.rawCalculate.bind(c));

export default router;

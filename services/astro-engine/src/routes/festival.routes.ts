import { Router } from "express";
import { festivalController } from "../controllers/festival/festival.controller";

const router = Router();

// =============================================================================
// FESTIVAL CALENDAR ROUTES
// All routes are prefixed with /api/festival in the main index router
// =============================================================================

// POST /api/festival/calendar - Full festival calendar for a year
router.post("/calendar", festivalController.getCalendar.bind(festivalController));

// POST /api/festival/by-id - Single festival by ID
router.post("/by-id", festivalController.getFestivalById.bind(festivalController));

// POST /api/festival/by-date - All festivals on a specific date
router.post("/by-date", festivalController.getFestivalsByDate.bind(festivalController));

// POST /api/festival/by-month - All festivals in a Gregorian month
router.post("/by-month", festivalController.getFestivalsByMonth.bind(festivalController));

// POST /api/festival/holidays - Government-gazetted holidays only
router.post("/holidays", festivalController.getHolidays.bind(festivalController));

// POST /api/festival/lunar-months - Hindu lunar month mapping
router.post("/lunar-months", festivalController.getLunarMonths.bind(festivalController));

// POST /api/festival/ekadashis - All Ekadashis with Parana windows
router.post("/ekadashis", festivalController.getEkadashis.bind(festivalController));

// POST /api/festival/sankrantis - All 12 solar ingress dates
router.post("/sankrantis", festivalController.getSankrantis.bind(festivalController));

// POST /api/festival/major - Major pan-India festivals only
router.post("/major", festivalController.getMajorFestivals.bind(festivalController));

// POST /api/festival/regional - Festivals for a specific state
router.post("/regional", festivalController.getRegionalFestivals.bind(festivalController));

// POST /api/festival/upcoming - Next N festivals from a date
router.post("/upcoming", festivalController.getUpcomingFestivals.bind(festivalController));

// GET /api/festival/categories - List all festival categories
router.get("/categories", festivalController.getCategories.bind(festivalController));

export default router;

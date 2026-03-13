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

// 13. Vrat Calendar - Consolidated fasting calendar
router.post("/vrat-calendar", festivalController.getVratCalendar.bind(festivalController));

// 14. Eclipses - Solar & lunar eclipse dates (Grahan)
router.post("/eclipses", festivalController.getEclipses.bind(festivalController));

// 15. Month View - Calendar grid with daily Panchang
router.post("/month-view", festivalController.getMonthView.bind(festivalController));

// 16. Today - Home screen combined data
router.post("/today", festivalController.getTodayData.bind(festivalController));

// 17. Samvatsara - 60-year Jovian cycle metadata
router.post("/samvatsara", festivalController.getSamvatsara.bind(festivalController));

// 18. Ritu - 6 Hindu seasons with date ranges
router.post("/ritu", festivalController.getRitu.bind(festivalController));

// 19. Amrit Siddhi Yoga - Universally auspicious dates
router.post("/amrit-siddhi-yoga", festivalController.getAmritSiddhiYoga.bind(festivalController));

// 20. Nakshatra Transit - Moon's daily nakshatra position
router.post("/nakshatra-transit", festivalController.getNakshatraTransit.bind(festivalController));

// 21. Planetary Transit - Planet sign changes (Gochar)
router.post("/planetary-transit", festivalController.getPlanetaryTransit.bind(festivalController));

export default router;

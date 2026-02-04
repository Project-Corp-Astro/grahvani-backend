import { Router } from 'express';
import { chartController } from '../controllers/chart.controller';
import { dashaController } from '../controllers/dasha.controller';
import { kpController } from '../controllers/kp.controller';

const router = Router();

// =============================================================================
// NATAL & SPECIAL CHARTS
// =============================================================================
router.post('/natal', chartController.getNatalChart.bind(chartController));
router.post('/transit', chartController.getTransitChart.bind(chartController));
router.post('/moon-chart', chartController.getMoonChart.bind(chartController));
router.post('/sun-chart', chartController.getSunChart.bind(chartController));
router.post('/sudarshan-chakra', chartController.getSudarshanChakra.bind(chartController));

// =============================================================================
// DIVISIONAL CHARTS (D2-D60)
// =============================================================================
router.post('/divisional/:type', chartController.getDivisionalChart.bind(chartController));
router.post('/yoga/:type', chartController.getYoga.bind(chartController));
router.post('/dosha/:type', chartController.getDosha.bind(chartController));
router.post('/remedy/:type', chartController.getRemedy.bind(chartController));
router.post('/panchanga/:type?', chartController.getPanchanga.bind(chartController));
router.post('/special/:type', chartController.getSpecialChart.bind(chartController));
router.post('/shadbala', chartController.getSpecialChart.bind(chartController)); // Shadbala is a special calculation

// =============================================================================
// ASHTAKAVARGA
// =============================================================================
router.post('/ashtakavarga', chartController.getAshtakavarga.bind(chartController));
router.post('/sarva-ashtakavarga', chartController.getSarvaAshtakavarga.bind(chartController));
router.post('/shodasha-varga', chartController.getShodashaVarga.bind(chartController));
router.post('/shodasha-varga-summary', chartController.getShodashaVargaSummary.bind(chartController));

// =============================================================================
// DASHA
// =============================================================================
router.post('/dasha/vimshottari', dashaController.getVimshottariDasha.bind(dashaController));
router.post('/dasha/prana', dashaController.getPranaDasha.bind(dashaController));
router.post('/dasha/other', dashaController.getOtherDasha.bind(dashaController));

// =============================================================================
// KP SYSTEM
// =============================================================================
router.post('/kp/planets-cusps', kpController.getPlanetsCusps.bind(kpController));
router.post('/kp/ruling-planets', kpController.getRulingPlanets.bind(kpController));
router.post('/kp/bhava-details', kpController.getBhavaDetails.bind(kpController));
router.post('/kp/significations', kpController.getSignifications.bind(kpController));
router.post('/kp/horary', kpController.getHorary.bind(kpController));

export default router;

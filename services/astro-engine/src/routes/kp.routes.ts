import { Router } from 'express';
import { kpPlanetsCuspsController, kpHoraryController } from '../controllers';

const router = Router();

// =============================================================================
// KP SYSTEM ROUTES
// =============================================================================

// Planets & Cusps
router.post('/planets-cusps', kpPlanetsCuspsController.getPlanetsCusps.bind(kpPlanetsCuspsController));
router.post('/ruling-planets', kpPlanetsCuspsController.getRulingPlanets.bind(kpPlanetsCuspsController));
router.post('/bhava-details', kpPlanetsCuspsController.getBhavaDetails.bind(kpPlanetsCuspsController));
router.post('/significations', kpPlanetsCuspsController.getSignifications.bind(kpPlanetsCuspsController));
router.post('/shodasha_varga_signs', kpPlanetsCuspsController.getShodashaVargaSummary.bind(kpPlanetsCuspsController));

// Horary
router.post('/horary', kpHoraryController.getHorary.bind(kpHoraryController));

export default router;

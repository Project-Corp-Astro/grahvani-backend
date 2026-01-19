import { Router } from 'express';
import { ramanController } from '../controllers/raman.controller';

const router = Router();

// =============================================================================
// RAMAN AYANAMSA SYSTEM ROUTES
// All endpoints specific to Raman Ayanamsa calculations
// =============================================================================

// Natal & Transit Charts
router.post('/natal', ramanController.getNatalChart.bind(ramanController));
router.post('/transit', ramanController.getTransitChart.bind(ramanController));
router.post('/moon', ramanController.getMoonChart.bind(ramanController));
router.post('/sun', ramanController.getSunChart.bind(ramanController));
router.post('/sudarshan-chakra', ramanController.getSudarshanChakra.bind(ramanController));

// Divisional Charts
router.post('/divisional/:type', ramanController.getDivisionalChart.bind(ramanController));

// Lagna Charts
router.post('/arudha-lagna', ramanController.getArudhaLagna.bind(ramanController));
router.post('/bhava-lagna', ramanController.getBhavaLagna.bind(ramanController));
router.post('/hora-lagna', ramanController.getHoraLagna.bind(ramanController));
router.post('/sripathi-bhava', ramanController.getSripathiBhava.bind(ramanController));
router.post('/kp-bhava', ramanController.getKpBhava.bind(ramanController));
router.post('/equal-bhava', ramanController.getEqualBhava.bind(ramanController));
router.post('/karkamsha-d1', ramanController.getKarkamshaD1.bind(ramanController));
router.post('/karkamsha-d9', ramanController.getKarkamshaD9.bind(ramanController));

// Ashtakavarga
router.post('/bhinna-ashtakavarga', ramanController.getBhinnaAshtakavarga.bind(ramanController));
router.post('/sarva-ashtakavarga', ramanController.getSarvaAshtakavarga.bind(ramanController));
router.post('/shodasha-varga', ramanController.getShodashaVarga.bind(ramanController));

// Dasha
router.post('/dasha/maha-antar', ramanController.getMahaAntarDasha.bind(ramanController));
router.post('/dasha/pratyantar', ramanController.getPratyantarDasha.bind(ramanController));
router.post('/dasha/sookshma', ramanController.getSookshmaDasha.bind(ramanController));
router.post('/dasha/prana', ramanController.getPranaDasha.bind(ramanController));

export default router;

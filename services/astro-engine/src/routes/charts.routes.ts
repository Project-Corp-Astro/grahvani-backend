import { Router } from 'express';
import { natalController, divisionalController, specialChartsController } from '../controllers';

const router = Router();

// =============================================================================
// CHARTS ROUTES
// =============================================================================

// Natal Chart (D1)
router.post('/natal', natalController.getNatalChart.bind(natalController));

// Divisional Charts (D2-D60)
router.post('/divisional/:type', divisionalController.getDivisionalChart.bind(divisionalController));
router.post('/navamsa', divisionalController.getNavamsa.bind(divisionalController));  // Convenience
router.post('/dasamsa', divisionalController.getDasamsa.bind(divisionalController));  // Convenience

// Special Charts
router.post('/transit', specialChartsController.getTransitChart.bind(specialChartsController));
router.post('/moon', specialChartsController.getMoonChart.bind(specialChartsController));
router.post('/sun', specialChartsController.getSunChart.bind(specialChartsController));
router.post('/sudarshan-chakra', specialChartsController.getSudarshanChakra.bind(specialChartsController));

export default router;

import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { familyController } from '../controllers/family.controller';
import { historyController } from '../controllers/history.controller';
import { chartController } from '../controllers/chart.controller';
import { remedyController } from '../controllers/remedy.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware); // Strict tenant enforcement

router.get('/', clientController.getClients.bind(clientController));
router.post('/', clientController.createClient.bind(clientController));
router.get('/:id', clientController.getClient.bind(clientController));
router.patch('/:id', clientController.updateClient.bind(clientController));
router.delete('/:id', clientController.deleteClient.bind(clientController));

// Family Relationships
router.post('/:id/family-link', familyController.linkFamilyMember.bind(familyController));
router.get('/:id/family', familyController.getFamilyLinks.bind(familyController));
router.delete('/:id/family/:relatedId', familyController.removeFamilyLink.bind(familyController));

// Consultation History
router.post('/:id/history', historyController.addConsultation.bind(historyController));
router.get('/:id/history', historyController.getHistory.bind(historyController));

// Saved Charts
router.post('/:id/charts', chartController.saveChart.bind(chartController));
router.get('/:id/charts', chartController.getCharts.bind(chartController));
router.delete('/:id/charts/:chartId', chartController.deleteChart.bind(chartController));

// Chart Generation (via Astro Engine)
router.post('/charts/generate-all', chartController.generateAllClientsCharts.bind(chartController));
router.post('/:id/charts/generate', chartController.generateChart.bind(chartController));
router.post('/:id/charts/generate-core', chartController.generateCoreCharts.bind(chartController));
router.post('/:id/charts/generate-full', chartController.generateFullVedicProfile.bind(chartController));
router.post('/:id/dasha', chartController.generateDasha.bind(chartController));
router.post('/:id/dasha/other', chartController.generateOtherDasha.bind(chartController));
router.post('/:id/ashtakavarga', chartController.generateAshtakavarga.bind(chartController));
router.post('/:id/sudarshan-chakra', chartController.generateSudarshanChakra.bind(chartController));

// Remedies
router.post('/:id/remedies', remedyController.prescribeRemedy.bind(remedyController));
router.get('/:id/remedies', remedyController.getRemedies.bind(remedyController));
router.patch('/remedies/:remedyId', remedyController.updateStatus.bind(remedyController));

export default router;

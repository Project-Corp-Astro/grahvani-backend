import { Router } from 'express';
import { ClientController } from '../controllers/client.controller';

const router = Router();

router.get('/', ClientController.getClients);
router.post('/', ClientController.createClient);
router.get('/:id', ClientController.getClient);
router.patch('/:id', ClientController.updateClient);
router.delete('/:id', ClientController.deleteClient);

export default router;

import { Router } from 'express';
import clientRoutes from './client.routes';

const router = Router();

router.use('/clients', clientRoutes);

export default router;

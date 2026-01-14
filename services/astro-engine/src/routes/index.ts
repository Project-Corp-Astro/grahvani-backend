import { Router } from 'express';
import chartsRoutes from './charts.routes';
import kpRoutes from './kp.routes';
import dashaRoutes from './dasha.routes';
import ashtakavargaRoutes from './ashtakavarga.routes';
import ramanRoutes from './raman.routes';
import compatibilityRoutes from './compatibility.routes';

const router = Router();

// =============================================================================
// API ROUTES INDEX
// All routes are prefixed with /api in app.ts
// =============================================================================

// Charts: /api/charts/*
router.use('/charts', chartsRoutes);

// KP System: /api/kp/*
router.use('/kp', kpRoutes);

// Dasha: /api/dasha/*
router.use('/dasha', dashaRoutes);

// Ashtakavarga: /api/ashtakavarga/*
router.use('/ashtakavarga', ashtakavargaRoutes);

// Raman Ayanamsa System: /api/raman/*
router.use('/raman', ramanRoutes);

// Compatibility & Relationship: /api/compatibility/*
router.use('/compatibility', compatibilityRoutes);

export default router;

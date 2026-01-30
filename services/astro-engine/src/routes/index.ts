import { Router } from 'express';
import chartsRoutes from './charts.routes';
import kpRoutes from './kp.routes';
import dashaRoutes from './dasha.routes';
import ashtakavargaRoutes from './ashtakavarga.routes';
import ramanRoutes from './raman.routes';
import compatibilityRoutes from './compatibility.routes';
import numerologyRoutes from './numerology.routes';
import analysisRoutes from './analysis.routes';
import panchangaRoutes from './panchanga.routes';

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

// Numerology: /api/numerology/*
router.use('/numerology', numerologyRoutes);

// Analysis (Yogas, Doshas, Remedies): /api/analysis/*
router.use('/analysis', analysisRoutes);

// Panchanga: /api/panchanga/*
router.use('/panchanga', panchangaRoutes);

export default router;

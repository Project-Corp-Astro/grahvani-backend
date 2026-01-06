// Auth Routes
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
    loginRateLimiter,
    registerRateLimiter,
    passwordResetRateLimiter
} from '../middlewares/rate-limit.middleware';

const router = Router();
const authController = new AuthController();

// Public routes (no auth required)
router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/social-login', authController.socialLogin);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', passwordResetRateLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/activate', authController.activateAccount);

// Protected routes (auth required)
router.use(authMiddleware);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.get('/sessions', authController.getSessions);
router.post('/sessions/:id/revoke', authController.revokeSession);
router.post('/oauth/link', authController.linkOAuth);
router.delete('/oauth/:provider', authController.unlinkOAuth);
router.post('/change-password', authController.changePassword);

export { router as authRoutes };

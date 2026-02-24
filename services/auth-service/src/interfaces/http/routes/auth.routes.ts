// Auth Routes
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "@grahvani/contracts";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from "../../../validators/auth.validator";
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from "../middlewares/rate-limit.middleware";

const router = Router();
const authController = new AuthController();

// Public routes (no auth required)
router.post(
  "/register",
  registerRateLimiter,
  validateBody(RegisterSchema),
  authController.register,
);
router.post("/login", loginRateLimiter, validateBody(LoginSchema), authController.login);
router.post("/social-login", authController.socialLogin);
router.post("/refresh", validateBody(RefreshTokenSchema), authController.refreshToken);
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  validateBody(ForgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  passwordResetRateLimiter,
  validateBody(ResetPasswordSchema),
  authController.resetPassword,
);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);
router.post("/activate", authController.activateAccount);

// Protected routes (auth required)
router.use(authMiddleware);
router.post("/logout", authController.logout);
router.get("/me", authController.getCurrentUser);
router.get("/sessions", authController.getSessions);
router.post("/sessions/:id/revoke", authController.revokeSession);
router.post("/oauth/link", authController.linkOAuth);
router.delete("/oauth/:provider", authController.unlinkOAuth);
router.post("/change-password", validateBody(ChangePasswordSchema), authController.changePassword);

export { router as authRoutes };

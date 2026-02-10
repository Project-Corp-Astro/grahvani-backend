// User Routes - LLD Compliant Implementation
import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { PreferencesController } from "../controllers/preferences.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============ /me Endpoints (Must be before /:id to avoid conflict) ============
router.get("/me", UserController.getMe);
router.patch("/me", UserController.updateMe);
router.delete("/me", UserController.deleteMe);

// ============ /me/addresses Endpoints ============
router.get("/me/addresses", UserController.getMyAddresses);
router.post("/me/addresses", UserController.addAddress);
router.patch("/me/addresses/:id", UserController.updateAddress);
router.delete("/me/addresses/:id", UserController.deleteAddress);

// ============ /me/preferences Endpoints ============
router.get("/me/preferences", PreferencesController.getPreferences);
router.put("/me/preferences", PreferencesController.updatePreferences);
router.patch(
  "/me/preferences/:category/:key",
  PreferencesController.updateSinglePreference,
);
router.delete(
  "/me/preferences/:category/:key",
  PreferencesController.deletePreference,
);

// ============ Admin Endpoints ============
router.get("/", adminMiddleware, UserController.getUsers);

// ============ User by ID Endpoints ============
router.get("/:id", UserController.getUser);
router.patch("/:id/status", adminMiddleware, UserController.updateUserStatus);
router.patch("/:id/role", adminMiddleware, UserController.updateUserRole);

export default router;

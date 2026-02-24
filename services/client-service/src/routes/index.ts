import { Router } from "express";
import clientRoutes from "./client.routes";
import { geocodeController } from "../controllers/geocode.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Client CRUD routes
router.use("/clients", clientRoutes);

// Geocoding routes (for birth place autocomplete)
router.get(
  "/geocode/suggest",
  authMiddleware,
  geocodeController.getLocationSuggestions.bind(geocodeController),
);
router.post("/geocode", authMiddleware, geocodeController.geocodePlace.bind(geocodeController));

export default router;

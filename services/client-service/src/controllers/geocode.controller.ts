import { Response, NextFunction } from "express";
import { geocodeService } from "../services/geocode.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class GeocodeController {
  /**
   * GET /geocode/suggest?q=...
   * Location autocomplete for birth place entry
   */
  async getLocationSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 5;

      if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const suggestions = await geocodeService.getLocationSuggestions(query, limit);
      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /geocode
   * Get full geocoding result for a place
   */
  async geocodePlace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { place } = req.body;

      if (!place) {
        return res.status(400).json({ error: "Place is required" });
      }

      const result = await geocodeService.geocodeBirthPlace(place);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const geocodeController = new GeocodeController();

// Preferences Controller - API Layer
import { Response, NextFunction } from "express";
import { preferencesService } from "../services/preferences.service";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  GetPreferencesQuerySchema,
  BulkUpdatePreferencesRequestSchema,
} from "../dtos/preferences.dto";
// import { ValidationError } from "../errors";
import { v4 as uuidv4 } from "uuid";

export const PreferencesController = {
  /**
   * GET /me/preferences - Get user preferences
   */
  async getPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const validation = GetPreferencesQuerySchema.safeParse(req.query);
      if (!validation.success) {
        const errors: Record<string, string[]> = {};
        validation.error.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            errors,
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const userId = req.user!.id;
      const preferences = await preferencesService.getPreferences(
        userId,
        validation.data.category,
      );

      // If no preferences found, return defaults
      if (Object.keys(preferences).length === 0) {
        return res.json(preferencesService.getDefaultPreferences());
      }

      res.json(preferences);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /me/preferences - Bulk update preferences
   */
  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    try {
      const validation = BulkUpdatePreferencesRequestSchema.safeParse(req.body);
      if (!validation.success) {
        const errors: Record<string, string[]> = {};
        validation.error.errors.forEach((e) => {
          const path = e.path.join(".");
          if (!errors[path]) errors[path] = [];
          errors[path].push(e.message);
        });
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid preferences data",
            errors,
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const userId = req.user!.id;
      // Ensure all preferences have a value (filter out undefined)
      const validPreferences = validation.data.preferences.filter(
        (p): p is { category: string; key: string; value: unknown } =>
          p.value !== undefined,
      );

      const result = await preferencesService.bulkUpdatePreferences(
        userId,
        validPreferences,
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /me/preferences/:category/:key - Update single preference
   */
  async updateSinglePreference(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    const requestId = uuidv4();
    try {
      const { category, key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Value is required",
            requestId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const userId = req.user!.id;
      const result = await preferencesService.updatePreference(
        userId,
        category,
        key,
        value,
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /me/preferences/:category/:key - Delete single preference
   */
  async deletePreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category, key } = req.params;
      const userId = req.user!.id;

      await preferencesService.deletePreference(userId, category, key);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

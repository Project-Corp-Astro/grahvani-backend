import { Request, Response } from "express";
import { lahiriClient } from "../clients";
import { cacheService } from "../services/cache.service";
import { logger } from "../config/logger";

export class NumerologyController {
  /**
   * POST /api/numerology/chaldean
   */
  async getChaldeanNumerology(req: Request, res: Response): Promise<void> {
    try {
      const birthData = req.body;
      if (!birthData.name) {
        res.status(400).json({
          success: false,
          error: "Name is required for Chaldean numerology",
        });
        return;
      }

      const cacheKey = { ...birthData, type: "chaldean" };
      const cached = await cacheService.get<any>("numerology", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await lahiriClient.getChaldeanNumerology(birthData);
      await cacheService.set("numerology", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Chaldean numerology failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/numerology/loshu
   */
  async getLoShuGrid(req: Request, res: Response): Promise<void> {
    try {
      const birthData = req.body;
      if (!birthData.birthDate) {
        res.status(400).json({
          success: false,
          error: "Birth date is required for Lo Shu Grid",
        });
        return;
      }

      const cacheKey = { ...birthData, type: "loshu" };
      const cached = await cacheService.get<any>("numerology", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await lahiriClient.getLoShuGrid(birthData);
      await cacheService.set("numerology", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Lo Shu Grid failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const numerologyController = new NumerologyController();

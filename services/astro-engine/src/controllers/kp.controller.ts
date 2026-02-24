import { Request, Response } from "express";
import { astroEngineClient, BirthData } from "../services/astro-client";
import { cacheService } from "../services/cache.service";
import { logger } from "../config/logger";

export class KpController {
  /**
   * POST /internal/kp/planets-cusps
   * Get KP Planets and Cusps with sub-lords
   */
  async getPlanetsCusps(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-planets-cusps" };
      const cached = await cacheService.get<any>("kp-planets-cusps", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await astroEngineClient.getKpPlanetsCusps(birthData);
      await cacheService.set("kp-planets-cusps", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "KP Planets/Cusps failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /internal/kp/ruling-planets
   */
  async getRulingPlanets(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      // Short cache for ruling planets (changes based on current time)
      const cacheKey = { ...birthData, type: "ruling-planets" };
      const cached = await cacheService.get<any>("ruling-planets", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await astroEngineClient.getRulingPlanets(birthData);
      await cacheService.set("ruling-planets", cacheKey, data, 300); // 5 min cache
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Ruling planets failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /internal/kp/bhava-details
   */
  async getBhavaDetails(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "bhava-details" };
      const cached = await cacheService.get<any>("bhava-details", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await astroEngineClient.getBhavaDetails(birthData);
      await cacheService.set("bhava-details", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Bhava details failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /internal/kp/significations
   */
  async getSignifications(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "significations" };
      const cached = await cacheService.get<any>("significations", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await astroEngineClient.getSignifications(birthData);
      await cacheService.set("significations", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Significations failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /internal/kp/planet-significators
   */
  async getPlanetSignificators(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "planet-significators" };
      const cached = await cacheService.get<any>("planet-significators", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await astroEngineClient.getPlanetSignificators(birthData);
      await cacheService.set("planet-significators", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Planet Significators failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /internal/kp/horary
   */
  async getHorary(req: Request, res: Response): Promise<void> {
    try {
      const { horaryNumber, question, ...birthData } = req.body;

      if (!horaryNumber || !question) {
        res.status(400).json({ success: false, error: "Missing horaryNumber or question" });
        return;
      }
      if (!this.validateBirthData(birthData as BirthData, res)) return;

      // No caching for horary (unique questions)
      const data = await astroEngineClient.getKpHorary({
        ...(birthData as BirthData),
        horaryNumber,
        question,
      });

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "KP Horary failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private validateBirthData(data: BirthData, res: Response): boolean {
    if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return false;
    }
    return true;
  }
}

export const kpController = new KpController();

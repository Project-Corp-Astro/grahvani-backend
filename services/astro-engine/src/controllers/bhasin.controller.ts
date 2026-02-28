import { Request, Response } from "express";
import { bhasinClient } from "../clients";
import { BirthData, AyanamsaType } from "../types/birth-data.types";
import { cacheService } from "../services/cache.service";
import { logger } from "../config/logger";

// =============================================================================
// BHASIN AYANAMSA CONTROLLER
// Handles all Bhasin-specific routes
// =============================================================================

export class BhasinController {
  /**
   * POST /api/bhasin/natal
   */
  async getNatalChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "natal", ayanamsa: "bhasin" };
      const cached = await cacheService.get<any>("natal:bhasin", cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          ayanamsa: "bhasin",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const chartData = await bhasinClient.getNatalChart(birthData);
      await cacheService.set("natal:bhasin", cacheKey, chartData);

      res.json({
        success: true,
        data: chartData,
        cached: false,
        ayanamsa: "bhasin",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Bhasin natal chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/bhasin/transit
   */
  async getTransitChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "transit", ayanamsa: "bhasin" };
      const cached = await cacheService.get<any>("transit:bhasin", cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          ayanamsa: "bhasin",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const chartData = await bhasinClient.getTransitChart(birthData);
      await cacheService.set("transit:bhasin", cacheKey, chartData, 3600);

      res.json({
        success: true,
        data: chartData,
        cached: false,
        ayanamsa: "bhasin",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Bhasin transit chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/bhasin/divisional/:type
   */
  async getDivisionalChart(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type, ayanamsa: "bhasin" };
      const cached = await cacheService.get<any>(`divisional:${type}:bhasin`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          chartType: type,
          ayanamsa: "bhasin",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const chartData = await bhasinClient.getDivisionalChart(birthData, type);
      await cacheService.set(`divisional:${type}:bhasin`, cacheKey, chartData);

      res.json({
        success: true,
        data: chartData,
        cached: false,
        chartType: type,
        ayanamsa: "bhasin",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error(
        { error: error.message, type: req.params.type },
        "Bhasin divisional chart failed",
      );
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/bhasin/dasha/:level
   */
  async getDasha(req: Request, res: Response): Promise<void> {
    try {
      const { level } = req.params;
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: `dasha:${level}`, ayanamsa: "bhasin" };
      const cached = await cacheService.get<any>(`dasha:${level}:bhasin`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          level,
          ayanamsa: "bhasin",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const chartData = await bhasinClient.getVimshottariDasha(birthData, level);
      await cacheService.set(`dasha:${level}:bhasin`, cacheKey, chartData);

      res.json({
        success: true,
        data: chartData,
        cached: false,
        level,
        ayanamsa: "bhasin",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Bhasin dasha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/bhasin/ashtakavarga/:type
   */
  async getAshtakavarga(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: `ashtakavarga:${type}`, ayanamsa: "bhasin" };
      const cached = await cacheService.get<any>(`ashtakavarga:${type}:bhasin`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          ayanamsa: "bhasin",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      let chartData;
      if (type === "bhinna") {
        chartData = await bhasinClient.getBhinnaAshtakavarga(birthData);
      } else if (type === "sarva") {
        chartData = await bhasinClient.getSarvaAshtakavarga(birthData);
      } else if (type === "shodasha") {
        chartData = await bhasinClient.getShodashaVarga(birthData);
      } else {
        res.status(400).json({ success: false, error: `Invalid ashtakavarga type: ${type}` });
        return;
      }

      await cacheService.set(`ashtakavarga:${type}:bhasin`, cacheKey, chartData);

      res.json({
        success: true,
        data: chartData,
        cached: false,
        ayanamsa: "bhasin",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Bhasin ashtakavarga failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/bhasin/:type
   * Generic handler for special Bhasin charts (lagna charts, etc.)
   */
  async getSpecialChart(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const methodMap: Record<string, (data: BirthData) => Promise<any>> = {
        moon_chart: (d) => bhasinClient.getMoonChart(d),
        sun_chart: (d) => bhasinClient.getSunChart(d),
        arudha_lagna: (d) => bhasinClient.getArudhaLagna(d),
        bhava_lagna: (d) => bhasinClient.getBhavaLagna(d),
        hora_lagna: (d) => bhasinClient.getHoraLagna(d),
        sripathi_bhava: (d) => bhasinClient.getSripathiBhava(d),
        kp_bhava: (d) => bhasinClient.getKpBhava(d),
        equal_bhava: (d) => bhasinClient.getEqualBhava(d),
        gl_chart: (d) => bhasinClient.getGlChart(d),
        karkamsha_d1: (d) => bhasinClient.getKarkamshaD1(d),
        karkamsha_d9: (d) => bhasinClient.getKarkamshaD9(d),
        sudarshan_chakra: (d) => bhasinClient.getSudarshanChakra(d),
      };

      const handler = methodMap[type.toLowerCase()];
      if (!handler) {
        res.status(400).json({ success: false, error: `Unknown Bhasin chart type: ${type}` });
        return;
      }

      const chartData = await handler(birthData);
      res.json({
        success: true,
        data: chartData,
        cached: false,
        ayanamsa: "bhasin",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message, type: req.params.type }, "Bhasin special chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private validateBirthData(data: BirthData, res: Response): boolean {
    if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: birthDate, birthTime, latitude, longitude",
      });
      return false;
    }
    return true;
  }
}

export const bhasinController = new BhasinController();

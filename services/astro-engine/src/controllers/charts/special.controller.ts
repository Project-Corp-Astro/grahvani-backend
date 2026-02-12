import { Request, Response } from "express";
import {
  lahiriClient,
  ramanClient,
  yukteswarClient,
  BirthData,
  DailyTransitData,
  AyanamsaType,
} from "../../clients";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../config/logger";

// =============================================================================
// SPECIAL CHARTS CONTROLLER
// Handles Transit, Moon, Sun, Sudarshan Chakra
// =============================================================================

export class SpecialChartsController {
  /**
   * POST /api/charts/transit
   */
  async getTransitChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "transit", ayanamsa };
      const cached = await cacheService.get<any>(
        `transit:${ayanamsa}`,
        cacheKey,
      );

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getTransitChart(birthData);

      // Shorter cache for transit (1 hour)
      await cacheService.set(`transit:${ayanamsa}`, cacheKey, data, 3600);

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Transit chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/daily-transit
   * Dynamic daily transit — Lahiri-only, no DB storage, no cache
   * Returns transit positions for each day in the given date range
   */
  async getDailyTransit(req: Request, res: Response): Promise<void> {
    try {
      const transitData: DailyTransitData = req.body;

      if (!this.validateBirthData(transitData, res)) return;

      // Validate transit date range
      if (!transitData.transitStartDate || !transitData.transitEndDate) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: transitStartDate and transitEndDate",
        });
        return;
      }

      logger.info(
        {
          startDate: transitData.transitStartDate,
          endDate: transitData.transitEndDate,
        },
        "Daily transit request (Lahiri-only)",
      );

      // Lahiri-only — call lahiriClient directly
      const data = await lahiriClient.getDailyTransit(transitData);

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Daily transit failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/moon
   */
  async getMoonChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "moon", ayanamsa };
      const cached = await cacheService.get<any>(`moon:${ayanamsa}`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getMoonChart(birthData);
      await cacheService.set(`moon:${ayanamsa}`, cacheKey, data);

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Moon chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/sun
   */
  async getSunChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "sun", ayanamsa };
      const cached = await cacheService.get<any>(`sun:${ayanamsa}`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getSunChart(birthData);
      await cacheService.set(`sun:${ayanamsa}`, cacheKey, data);

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Sun chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/sudarshan-chakra
   */
  async getSudarshanChakra(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "sudarshan", ayanamsa };
      const cached = await cacheService.get<any>(
        `sudarshan:${ayanamsa}`,
        cacheKey,
      );

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getSudarshanChakra(birthData);
      await cacheService.set(`sudarshan:${ayanamsa}`, cacheKey, data);

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Sudarshan Chakra failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/arudha-lagna
   */
  async getArudhaLagna(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "arudha", ayanamsa };
      const cached = await cacheService.get<any>(
        `arudha:${ayanamsa}`,
        cacheKey,
      );
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getArudhaLagna(birthData);
      await cacheService.set(`arudha:${ayanamsa}`, cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Arudha Lagna failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/bhava-lagna
   */
  async getBhavaLagna(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "bhava", ayanamsa };
      const cached = await cacheService.get<any>(`bhava:${ayanamsa}`, cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getBhavaLagna(birthData);
      await cacheService.set(`bhava:${ayanamsa}`, cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Bhava Lagna failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/hora-lagna
   */
  async getHoraLagna(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "hora", ayanamsa };
      const cached = await cacheService.get<any>(`hora:${ayanamsa}`, cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getHoraLagna(birthData);
      await cacheService.set(`hora:${ayanamsa}`, cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Hora Lagna failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/sripathi-bhava
   */
  async getSripathiBhava(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const client = this.getClient(ayanamsa);
      const data = await client.getSripathiBhava(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Sripathi Bhava failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/kp-bhava
   */
  async getKpBhava(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const client = this.getClient(ayanamsa);
      const data = await client.getKpBhava(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "KP Bhava failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/equal-bhava
   */
  async getEqualBhava(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const client = this.getClient(ayanamsa);
      const data = await client.getEqualBhava(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Equal Bhava failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/karkamsha-d1
   */
  async getKarkamshaD1(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const client = this.getClient(ayanamsa);
      const data = await client.getKarkamshaD1(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Karkamsha D1 failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/karkamsha-d9
   */
  async getKarkamshaD9(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const client = this.getClient(ayanamsa);
      const data = await client.getKarkamshaD9(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Karkamsha D9 failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/mandi
   */
  async getMandi(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      if (ayanamsa !== "lahiri") {
        res.status(400).json({
          success: false,
          error: "Mandi only supported for Lahiri system",
        });
        return;
      }

      const data = await lahiriClient.getMandi(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Mandi failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/gulika
   */
  async getGulika(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      if (ayanamsa !== "lahiri") {
        res.status(400).json({
          success: false,
          error: "Gulika only supported for Lahiri system",
        });
        return;
      }

      const data = await lahiriClient.getGulika(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Gulika failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/shodasha-varga
   */
  async getShodashaVarga(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "shodasha-varga", ayanamsa };
      const cached = await cacheService.get<any>(
        `shodasha-varga:${ayanamsa}`,
        cacheKey,
      );
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const data = await client.getShodashaVarga(birthData);
      await cacheService.set(`shodasha-varga:${ayanamsa}`, cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Shodasha Varga failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private getClient(ayanamsa: AyanamsaType) {
    if (ayanamsa === "raman") return ramanClient;
    if (ayanamsa === "yukteswar") return yukteswarClient;
    return lahiriClient;
  }

  private validateBirthData(data: BirthData, res: Response): boolean {
    if (
      !data.birthDate ||
      !data.birthTime ||
      !data.latitude ||
      !data.longitude
    ) {
      res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
      return false;
    }
    return true;
  }
}

export const specialChartsController = new SpecialChartsController();

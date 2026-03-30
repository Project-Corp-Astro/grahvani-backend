import { Request, Response } from "express";
import {
  lahiriClient,
  ramanClient,
  yukteswarClient,
  bhasinClient,
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
      const cached = await cacheService.get<any>(`transit:${ayanamsa}`, cacheKey);

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
      const cached = await cacheService.get<any>(`sudarshan:${ayanamsa}`, cacheKey);

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
      const cached = await cacheService.get<any>(`arudha:${ayanamsa}`, cacheKey);
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
   * POST /api/charts/upapada-lagna
   */
  async getUpapadaLagna(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      if (ayanamsa !== "lahiri") {
        res.status(400).json({
          success: false,
          error: "Upapada Lagna only supported for Lahiri system",
        });
        return;
      }

      const data = await lahiriClient.getUpapadaLagna(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Upapada Lagna failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/swamsha
   */
  async getSwamsha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      if (ayanamsa !== "lahiri") {
        res.status(400).json({
          success: false,
          error: "Swamsha only supported for Lahiri system",
        });
        return;
      }

      const data = await lahiriClient.getSwamsha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Swamsha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/panchadha-maitri
   */
  async getPanchadhaMaitri(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      if (ayanamsa !== "lahiri") {
        res.status(400).json({
          success: false,
          error: "Panchadha Maitri only supported for Lahiri system",
        });
        return;
      }

      const data = await lahiriClient.getPanchadhaMaitri(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Panchadha Maitri failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/pada-chart
   */
  async getPadaChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      if (ayanamsa !== "lahiri") {
        res.status(400).json({
          success: false,
          error: "Pada Chart only supported for Lahiri system",
        });
        return;
      }

      const data = await lahiriClient.getPadaChart(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Pada Chart failed");
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
      const cached = await cacheService.get<any>(`shodasha-varga:${ayanamsa}`, cacheKey);
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

  // =========================================================================
  // SPECIALIZED DIVISIONAL CHARTS (Lahiri-only)
  // =========================================================================

  /**
   * POST /api/charts/d2-somanatha
   */
  async getD2Somanatha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD2Somanatha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D2 Somanatha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d2-kashinatha
   */
  async getD2Kashinatha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD2Kashinatha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D2 Kashinatha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d4-vedamsha
   */
  async getD4Vedamsha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD4Vedamsha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D4 Vedamsha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d6-kaulaka
   */
  async getD6Kaulaka(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD6Kaulaka(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D6 Kaulaka failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d9-nadhi
   */
  async getD9Nadhi(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD9Nadhi(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D9 Nadhi failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d9-pada
   */
  async getD9Pada(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD9Pada(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D9 Pada failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d9-somanatha
   */
  async getD9Somanatha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD9Somanatha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D9 Somanatha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d24-parasidamsha
   */
  async getD24Parasidamsha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD24Parasidamsha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D24 Parasidamsha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d24-siddhamsha
   */
  async getD24Siddhamsha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD24Siddhamsha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D24 Siddhamsha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d30-venkatesha
   */
  async getD30Venkatesha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD30Venkatesha(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D30 Venkatesha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d108-nd
   */
  async getD108ND(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD108ND(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D108 ND failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d108-dn
   */
  async getD108DN(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD108DN(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D108 DN failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d2-iyer
   */
  async getD2Iyer(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD2Iyer(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D2 Iyer failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d5
   */
  async getD5(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD5(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D5 failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d8-chart
   */
  async getD8Chart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD8Chart(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D8 Chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/charts/d11
   */
  async getD11(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const data = await lahiriClient.getD11(birthData);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "D11 failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  private getClient(ayanamsa: AyanamsaType) {
    if (ayanamsa === "raman") return ramanClient;
    if (ayanamsa === "yukteswar") return yukteswarClient;
    if (ayanamsa === "bhasin") return bhasinClient;
    return lahiriClient;
  }

  private validateBirthData(data: BirthData, res: Response): boolean {
    if (!data.birthDate || !data.birthTime || !data.latitude || !data.longitude) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return false;
    }
    return true;
  }
}

export const specialChartsController = new SpecialChartsController();

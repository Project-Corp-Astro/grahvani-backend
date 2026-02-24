import { Request, Response } from "express";
import { kpClient, BirthData, HoraryData } from "../../clients";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../config/logger";

// =============================================================================
// KP SYSTEM CONTROLLER
// Handles all Krishnamurti Paddhati calculations
// =============================================================================

export class KpPlanetsCuspsController {
  /**
   * POST /api/kp/planets-cusps
   * Get planets and cusps with sub-lords
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

      const data = await kpClient.getPlanetsCusps(birthData);
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
   * POST /api/kp/ruling-planets
   */
  async getRulingPlanets(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      // Short cache for ruling planets (time-sensitive)
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

      const data = await kpClient.getRulingPlanets(birthData);
      await cacheService.set("ruling-planets", cacheKey, data, 300); // 5 min

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
   * POST /api/kp/bhava-details
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

      const data = await kpClient.getBhavaDetails(birthData);
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
   * POST /api/kp/significations
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

      const data = await kpClient.getSignifications(birthData);
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
   * POST /api/kp/shodasha_varga_signs
   */
  async getShodashaVargaSummary(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-shodasha-varga" };
      const cached = await cacheService.get<any>("kp-shodasha-varga", cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await kpClient.getShodashaVarga(birthData);
      await cacheService.set("kp-shodasha-varga", cacheKey, data);

      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "KP Shodasha Varga failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/house-significations
   */
  async getKpHouseSignifications(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-house-significations" };
      const cached = await cacheService.get<any>("kp-house-significations", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getSignifications(birthData);
      await cacheService.set("kp-house-significations", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/planet-significators
   */
  async getKpPlanetSignificators(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-planet-significators" };
      const cached = await cacheService.get<any>("kp-planet-significators", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getPlanetSignificators(birthData);
      await cacheService.set("kp-planet-significators", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/interlinks
   */
  async getKpInterlinks(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-interlinks" };
      const cached = await cacheService.get<any>("kp-interlinks", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getCuspalInterlink(birthData);
      await cacheService.set("kp-interlinks", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/interlinks-advanced
   */
  async getKpAdvancedInterlinks(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-interlinks-adv" };
      const cached = await cacheService.get<any>("kp-interlinks-adv", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getCuspalInterlinkAdvanced(birthData);
      await cacheService.set("kp-interlinks-adv", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/interlinks-sl
   */
  async getKpInterlinksSL(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-interlinks-sl" };
      const cached = await cacheService.get<any>("kp-interlinks-sl", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getCuspalInterlinkSL(birthData);
      await cacheService.set("kp-interlinks-sl", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/nakshatra-nadi
   */
  async getKpNakshatraNadi(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-nakshatra-nadi" };
      const cached = await cacheService.get<any>("kp-nakshatra-nadi", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getNakshatraNadi(birthData);
      await cacheService.set("kp-nakshatra-nadi", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/kp/fortuna
   */
  async getKpFortuna(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "kp-fortuna" };
      const cached = await cacheService.get<any>("kp-fortuna", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const data = await kpClient.getFortuna(birthData);
      await cacheService.set("kp-fortuna", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
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

export class KpHoraryController {
  /**
   * POST /api/kp/horary
   */
  async getHorary(req: Request, res: Response): Promise<void> {
    try {
      const { horaryNumber, question, ...birthData } = req.body;

      if (!horaryNumber || !question) {
        res.status(400).json({ success: false, error: "Missing horaryNumber or question" });
        return;
      }

      if (horaryNumber < 1 || horaryNumber > 249) {
        res.status(400).json({
          success: false,
          error: "Horary number must be between 1-249",
        });
        return;
      }

      // No caching for horary (unique questions)
      const horaryData: HoraryData = {
        ...birthData,
        horaryNumber,
        question,
      };

      const data = await kpClient.getHorary(horaryData);

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
}

export const kpPlanetsCuspsController = new KpPlanetsCuspsController();
export const kpHoraryController = new KpHoraryController();

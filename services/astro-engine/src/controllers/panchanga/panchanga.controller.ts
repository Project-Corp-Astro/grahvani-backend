import { Request, Response } from "express";
import { lahiriClient, ramanClient, yukteswarClient, BirthData, AyanamsaType } from "../../clients";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../config/logger";

// =============================================================================
// PANCHANGA CONTROLLER
// Handles Panchanga, Muhurat, and Timing
// =============================================================================

export class PanchangaController {
  async getPanchanga(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "panchanga" };
      const cached = await cacheService.get("panchanga", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getPanchanga(birthData);
      await cacheService.set("panchanga", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Panchanga");
    }
  }

  async getChoghadiya(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "choghadiya" };
      const cached = await cacheService.get("choghadiya", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getChoghadiya(birthData);
      await cacheService.set("choghadiya", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Choghadiya");
    }
  }

  async getHora(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "hora-times" };
      const cached = await cacheService.get("hora-times", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getHoraTimes(birthData);
      await cacheService.set("hora-times", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Hora");
    }
  }

  async getLagnaTimes(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "lagna-times" };
      const cached = await cacheService.get("lagna-times", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getLagnaTimes(birthData);
      await cacheService.set("lagna-times", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Lagna Times");
    }
  }

  async getMuhurat(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "muhurat" };
      const cached = await cacheService.get("muhurat", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getMuhurat(birthData);
      await cacheService.set("muhurat", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Muhurat");
    }
  }

  async getAvakhadaChakra(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "avakhada_chakra" };
      const cached = await cacheService.get("avakhada_chakra", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getAvakhadaChakra(birthData);
      await cacheService.set("avakhada_chakra", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Avakhada Chakra");
    }
  }

  async getTatkalikMaitriChakra(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "tatkalik_maitri_chakra" };
      const cached = await cacheService.get("tatkalik_maitri_chakra", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getTatkalikMaitriChakra(birthData);
      await cacheService.set("tatkalik_maitri_chakra", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Tatkalik Maitri Chakra");
    }
  }

  async getGlChart(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "gl_chart", ayanamsa };
      const cached = await cacheService.get("gl_chart", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const client = this.getClient(ayanamsa);
      // GL Chart might not be available for all systems, handle potential error
      if (typeof (client as any).getGlChart !== "function") {
        res.status(400).json({
          success: false,
          error: `GL Chart is not available for ${ayanamsa} system`,
        });
        return;
      }

      const data = await (client as any).getGlChart(birthData);
      await cacheService.set("gl_chart", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "GL Chart");
    }
  }

  async getKarakaStrength(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "karaka_strength", ayanamsa };
      const cached = await cacheService.get("karaka_strength", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const client = this.getClient(ayanamsa);
      // Karaka Strength might not be available for all systems, handle potential error
      if (typeof (client as any).getKarakaStrength !== "function") {
        res.status(400).json({
          success: false,
          error: `Karaka Strength is not available for ${ayanamsa} system`,
        });
        return;
      }

      const data = await (client as any).getKarakaStrength(birthData);
      await cacheService.set("karaka_strength", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Karaka Strength");
    }
  }

  async getPushkaraNavamsha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: "pushkara-navamsha" };
      const cached = await cacheService.get("pushkara-navamsha", cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true }) as any;

      const data = await lahiriClient.getPushkaraNavamsha(birthData);
      await cacheService.set("pushkara-navamsha", cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      this.handleError(res, error, "Pushkara Navamsha");
    }
  }

  private getClient(ayanamsa: AyanamsaType) {
    switch (ayanamsa) {
      case "raman":
        return ramanClient;
      case "yukteswar":
        return yukteswarClient;
      default:
        return lahiriClient;
    }
  }

  private validateBirthData(data: BirthData, res: Response): boolean {
    if (!data.birthDate || !data.latitude || !data.longitude) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return false;
    }
    return true;
  }

  private handleError(res: Response, error: any, context: string) {
    logger.error({ error: error.message }, `${context} failed`);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const panchangaController = new PanchangaController();

import { Request, Response } from "express";
import { lahiriClient, BirthData } from "../../clients";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../config/logger";

// =============================================================================
// ANALYSIS CONTROLLER
// Handles Yogas, Doshas, and Remedies
// =============================================================================

export class AnalysisController {
  // =========================================================================
  // YOGAS
  // =========================================================================

  async getYoga(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: `yoga-${type}` };
      const cached = await cacheService.get(`yoga:${type}`, cacheKey);

      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      let data;
      // Map type to client method
      switch (type.toLowerCase()) {
        case "gaja-kesari":
          data = await lahiriClient.getGajaKesariYoga(birthData);
          break;
        case "guru-mangal":
          data = await lahiriClient.getGuruMangalYoga(birthData);
          break;
        case "budha-aditya":
          data = await lahiriClient.getBudhaAdityaYoga(birthData);
          break;
        case "chandra-mangal":
          data = await lahiriClient.getChandraMangalYoga(birthData);
          break;
        case "raj-yoga":
          data = await lahiriClient.getRajYoga(birthData);
          break;
        case "pancha-mahapurusha":
          data = await lahiriClient.getPanchaMahapurushaYoga(birthData);
          break;
        case "dhan-yoga":
          data = await lahiriClient.getDhanYoga(birthData);
          break;
        case "malefic":
          data = await lahiriClient.getMaleficYogas(birthData);
          break;
        case "analysis":
          data = await lahiriClient.getYogaAnalysis(birthData);
          break;
        case "special":
          data = await lahiriClient.getSpecialYogas(birthData);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown yoga type: ${type}` });
          return;
      }

      await cacheService.set(`yoga:${type}`, cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      logger.error(
        { error: error.message, type: req.params.type },
        "Yoga analysis failed",
      );
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // =========================================================================
  // DOSHAS
  // =========================================================================

  async getDosha(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: `dosha-${type}` };
      const cached = await cacheService.get(`dosha:${type}`, cacheKey);

      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      let data;
      switch (type.toLowerCase()) {
        case "angarak":
          data = await lahiriClient.getAngarakDosha(birthData);
          break;
        case "guru-chandal":
          data = await lahiriClient.getGuruChandalDosha(birthData);
          break;
        case "shrapit":
          data = await lahiriClient.getShrapitDosha(birthData);
          break;
        case "sade-sati":
          data = await lahiriClient.getSadeSati(birthData);
          break;
        case "pitra":
          data = await lahiriClient.getPitraDosha(birthData);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown dosha type: ${type}` });
          return;
      }

      await cacheService.set(`dosha:${type}`, cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      logger.error(
        { error: error.message, type: req.params.type },
        "Dosha analysis failed",
      );
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // =========================================================================
  // REMEDIES
  // =========================================================================

  async getRemedies(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;

      if (!this.validateBirthData(birthData, res)) return;

      const cacheKey = { ...birthData, type: `remedies-${type}` };
      const cached = await cacheService.get(`remedies:${type}`, cacheKey);

      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      let data;
      switch (type.toLowerCase()) {
        case "yantra":
          data = await lahiriClient.getYantraRemedies(birthData);
          break;
        case "mantra":
          data = await lahiriClient.getMantraRemedies(birthData);
          break;
        case "vedic":
          data = await lahiriClient.getVedicRemedies(birthData);
          break;
        case "gemstone":
          data = await lahiriClient.getGemstoneRemedies(birthData);
          break;
        case "lal-kitab":
          data = await lahiriClient.getLalKitabRemedies(birthData);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown remedy type: ${type}` });
          return;
      }

      await cacheService.set(`remedies:${type}`, cacheKey, data);
      res.json({ success: true, data, cached: false });
    } catch (error: any) {
      logger.error(
        { error: error.message, type: req.params.type },
        "Remedies analysis failed",
      );
      res.status(500).json({ success: false, error: error.message });
    }
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

export const analysisController = new AnalysisController();

import { Request, Response } from "express";
import { lahiriClient, westernClient } from "../clients";
import { cacheService } from "../services/cache.service";
import { logger } from "../config/logger";
import { BirthData, SynastryData } from "../types";

// =============================================================================
// COMPATIBILITY CONTROLLER
// Handles Synastry, Composite, and Progressed chart calculations
// =============================================================================

export class CompatibilityController {
  // =========================================================================
  // LAHIRI SYSTEM (Default Vedic)
  // =========================================================================

  /**
   * POST /api/compatibility/synastry
   * Chart comparison between two people
   */
  async getSynastry(req: Request, res: Response): Promise<void> {
    try {
      const { person1, person2 } = req.body as SynastryData;

      if (!this.validateSynastryData(person1, person2, res)) return;

      const cacheKey = { person1, person2, type: "synastry" };
      const cached = await cacheService.get<any>("synastry", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await lahiriClient.getSynastry({ person1, person2 });
      await cacheService.set("synastry", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Synastry calculation failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/compatibility/composite
   * Midpoint chart for two people
   */
  async getComposite(req: Request, res: Response): Promise<void> {
    try {
      const { person1, person2 } = req.body as SynastryData;

      if (!this.validateSynastryData(person1, person2, res)) return;

      const cacheKey = { person1, person2, type: "composite" };
      const cached = await cacheService.get<any>("composite", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await lahiriClient.getComposite({ person1, person2 });
      await cacheService.set("composite", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Composite calculation failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/compatibility/progressed
   * Secondary progressions for predictive analysis
   */
  async getProgressed(req: Request, res: Response): Promise<void> {
    try {
      const { birthData, progressedDate } = req.body;

      if (!this.validateBirthData(birthData, res)) return;
      if (!progressedDate) {
        res
          .status(400)
          .json({ success: false, error: "Missing progressedDate field" });
        return;
      }

      const cacheKey = { ...birthData, progressedDate, type: "progressed" };
      const cached = await cacheService.get<any>("progressed", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      // Use astroEngineClient progressed method
      const data = await (
        await import("../services/astro-client")
      ).astroEngineClient.getProgressedChart(birthData, progressedDate);
      await cacheService.set("progressed", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Progressed chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // =========================================================================
  // WESTERN SYSTEM (Tropical)
  // =========================================================================

  async getWesternSynastry(req: Request, res: Response): Promise<void> {
    try {
      const { person1, person2 } = req.body as SynastryData;

      if (!this.validateSynastryData(person1, person2, res)) return;

      const cacheKey = { person1, person2, type: "western-synastry" };
      const cached = await cacheService.get<any>("western-synastry", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          system: "western",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await westernClient.getSynastry({ person1, person2 });
      await cacheService.set("western-synastry", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        system: "western",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Western Synastry failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWesternComposite(req: Request, res: Response): Promise<void> {
    try {
      const { person1, person2 } = req.body as SynastryData;

      if (!this.validateSynastryData(person1, person2, res)) return;

      const cacheKey = { person1, person2, type: "western-composite" };
      const cached = await cacheService.get<any>("western-composite", cacheKey);
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          system: "western",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await westernClient.getComposite({ person1, person2 });
      await cacheService.set("western-composite", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        system: "western",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Western Composite failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWesternProgressed(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const progressedDate = req.body.progressedDate;

      if (!this.validateBirthData(birthData, res)) return;
      if (!progressedDate) {
        res
          .status(400)
          .json({ success: false, error: "Missing progressedDate field" });
        return;
      }

      const cacheKey = {
        ...birthData,
        progressedDate,
        type: "western-progressed",
      };
      const cached = await cacheService.get<any>(
        "western-progressed",
        cacheKey,
      );
      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          system: "western",
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await westernClient.getProgressedChart(
        birthData,
        progressedDate,
      );
      await cacheService.set("western-progressed", cacheKey, data);
      res.json({
        success: true,
        data,
        cached: false,
        system: "western",
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Western Progressed failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private validateBirthData(data: BirthData, res: Response): boolean {
    if (
      !data?.birthDate ||
      !data?.birthTime ||
      !data?.latitude ||
      !data?.longitude
    ) {
      res
        .status(400)
        .json({ success: false, error: "Missing required birth data fields" });
      return false;
    }
    return true;
  }

  private validateSynastryData(
    person1: BirthData,
    person2: BirthData,
    res: Response,
  ): boolean {
    if (!this.validateBirthData(person1, res)) return false;
    if (
      !person2?.birthDate ||
      !person2?.birthTime ||
      !person2?.latitude ||
      !person2?.longitude
    ) {
      res.status(400).json({
        success: false,
        error: "Missing required birth data for person2",
      });
      return false;
    }
    return true;
  }

  private buildPayload(data: BirthData): Record<string, any> {
    return {
      user_name: data.userName || "grahvani_client",
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: String(data.latitude),
      longitude: String(data.longitude),
      timezone_offset: data.timezoneOffset,
    };
  }
}

export const compatibilityController = new CompatibilityController();

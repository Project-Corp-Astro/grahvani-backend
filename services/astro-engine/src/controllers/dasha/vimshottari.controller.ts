import { Request, Response } from "express";
import { kpClient, ramanClient, lahiriClient, BirthData } from "../../clients";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../config/logger";

// =============================================================================
// VIMSHOTTARI DASHA CONTROLLER
// Handles 5-level Vimshottari Dasha calculations
// =============================================================================

export class VimshottariController {
  /**
   * POST /api/dasha/vimshottari
   * Get Vimshottari Dasha at specified level
   * Query param: level = mahadasha | antardasha | pratyantardasha | sookshma | prana
   */
  async getDasha(req: Request, res: Response): Promise<void> {
    try {
      const birthData: BirthData = req.body;
      const level = (req.query.level as string) || "mahadasha";
      const mahaLord = req.query.mahaLord as string;
      const antarLord = req.query.antarLord as string;
      const pratyantarLord = req.query.pratyantarLord as string;

      if (!this.validateBirthData(birthData, res)) return;
      if (!this.validateLevel(level, res)) return;

      // Route to correct client based on ayanamsa
      const ayanamsa = (birthData.ayanamsa || "lahiri").toLowerCase();
      let client;
      if (ayanamsa === "kp") {
        client = kpClient;
      } else if (ayanamsa === "raman") {
        client = ramanClient;
      } else {
        client = lahiriClient;
      }

      const context = { mahaLord, antarLord, pratyantarLord };
      const cacheKey = {
        ...birthData,
        ...context,
        type: `dasha:${level}`,
        ayanamsa,
      };
      const cached = await cacheService.get<any>(`dasha:${level}`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          level,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const data = await client.getVimshottariDasha(birthData, level, context);
      await cacheService.set(`dasha:${level}`, cacheKey, data);

      res.json({
        success: true,
        data,
        cached: false,
        level,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, "Vimshottari Dasha failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/dasha/prana
   * Convenience endpoint for full 5-level dasha
   */
  async getPranaDasha(req: Request, res: Response): Promise<void> {
    req.query.level = "prana";
    return this.getDasha(req, res);
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

  private validateLevel(level: string, res: Response): boolean {
    const validLevels = [
      "mahadasha",
      "antardasha",
      "pratyantardasha",
      "sookshma",
      "prana",
    ];
    if (!validLevels.includes(level.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: `Invalid level. Valid: ${validLevels.join(", ")}`,
      });
      return false;
    }
    return true;
  }
}

export const vimshottariController = new VimshottariController();

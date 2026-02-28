import { Request, Response } from "express";
import { lahiriClient, ramanClient, yukteswarClient, bhasinClient, BirthData, AyanamsaType } from "../../clients";
import { cacheService } from "../../services/cache.service";
import { logger } from "../../config/logger";

// =============================================================================
// DIVISIONAL CHART CONTROLLER
// Handles D2-D60 chart generation
// =============================================================================

export class DivisionalController {
  /**
   * POST /api/charts/divisional/:type
   * Generate any divisional chart (D2, D3, D4, D7, D9, D10, etc.)
   */
  async getDivisionalChart(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const birthData: BirthData = req.body;
      const ayanamsa: AyanamsaType = birthData.ayanamsa || "lahiri";

      if (!this.validateBirthData(birthData, res)) return;
      if (!this.validateChartType(type, res)) return;

      const cacheKey = { ...birthData, type, ayanamsa };
      const cached = await cacheService.get<any>(`divisional:${type}:${ayanamsa}`, cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: cached,
          cached: true,
          chartType: type,
          ayanamsa,
          calculatedAt: new Date().toISOString(),
        });
        return;
      }

      const client = this.getClient(ayanamsa);
      const chartData = await client.getDivisionalChart(birthData, type);

      await cacheService.set(`divisional:${type}:${ayanamsa}`, cacheKey, chartData);

      res.json({
        success: true,
        data: chartData,
        cached: false,
        chartType: type,
        ayanamsa,
        calculatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message, type: req.params.type }, "Divisional chart failed");
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Specific divisional chart endpoints for convenience
   */
  async getNavamsa(req: Request, res: Response): Promise<void> {
    req.params.type = "d9";
    return this.getDivisionalChart(req, res);
  }

  async getDasamsa(req: Request, res: Response): Promise<void> {
    req.params.type = "d10";
    return this.getDivisionalChart(req, res);
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

  private validateChartType(type: string, res: Response): boolean {
    const validTypes = [
      "d2",
      "d3",
      "d4",
      "d6",
      "d7",
      "d9",
      "d10",
      "d12",
      "d16",
      "d20",
      "d24",
      "d27",
      "d30",
      "d40",
      "d45",
      "d60",
      "d150",
    ];
    if (!validTypes.includes(type.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: `Invalid chart type. Valid types: ${validTypes.join(", ")}`,
      });
      return false;
    }
    return true;
  }
}

export const divisionalController = new DivisionalController();

// Dashboard Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { dashboardService } from "../services/dashboard.service";
import { logger } from "../config/logger";

export class DashboardController {
  async getStats(req: AdminRequest, res: Response) {
    try {
      const stats = await dashboardService.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      logger.error({ error }, "Failed to get dashboard stats");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load dashboard stats" } });
    }
  }

  async getGrowth(req: AdminRequest, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await dashboardService.getGrowthData(days);
      res.json({ success: true, data });
    } catch (error) {
      logger.error({ error }, "Failed to get growth data");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load growth data" } });
    }
  }
}

export const dashboardController = new DashboardController();

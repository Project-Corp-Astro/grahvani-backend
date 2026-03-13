// Navigation Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { navigationService } from "../services/navigation.service";
import { logger } from "../config/logger";

export class NavigationController {
  async getNavigation(req: AdminRequest, res: Response) {
    try {
      const nav = await navigationService.getNavigation();
      res.json({ success: true, data: nav });
    } catch (error) {
      logger.error({ error }, "Failed to get navigation");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load navigation" } });
    }
  }
}

export const navigationController = new NavigationController();

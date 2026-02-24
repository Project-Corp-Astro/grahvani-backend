import { Response, NextFunction } from "express";
import { historyService } from "../services/history.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class HistoryController {
  /**
   * POST /clients/:id/history
   */
  async addConsultation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      const consultation = await historyService.addConsultation(tenantId, id, req.body, metadata);
      res.status(201).json(consultation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clients/:id/history
   */
  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const history = await historyService.getClientHistory(tenantId, id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }
}

export const historyController = new HistoryController();

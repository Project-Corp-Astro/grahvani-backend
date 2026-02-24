import { Response, NextFunction } from "express";
import { remedyService } from "../services/remedy.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class RemedyController {
  /**
   * POST /clients/:id/remedies
   */
  async prescribeRemedy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      const remedy = await remedyService.prescribeRemedy(tenantId, id, req.body, metadata);
      res.status(201).json(remedy);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clients/:id/remedies
   */
  async getRemedies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const remedies = await remedyService.getClientRemedies(tenantId, id);
      res.json(remedies);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /clients/remedies/:remedyId
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { remedyId } = req.params;
      const { status } = req.body;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      const updated = await remedyService.updateRemedyStatus(tenantId, remedyId, status, metadata);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
}

export const remedyController = new RemedyController();

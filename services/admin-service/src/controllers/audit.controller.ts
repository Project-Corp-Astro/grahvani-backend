// Audit Log Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { auditService } from "../services/audit.service";
import { logger } from "../config/logger";

export class AuditController {
  async getLogs(req: AdminRequest, res: Response) {
    try {
      const result = await auditService.getLogs({
        adminId: req.query.adminId as string,
        action: req.query.action as any,
        targetType: req.query.targetType as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ error }, "Failed to get audit logs");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load audit logs" } });
    }
  }
}

export const auditController = new AuditController();

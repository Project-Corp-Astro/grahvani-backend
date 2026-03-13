// Support Ticket Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { supportService } from "../services/support.service";
import { createAuditLog } from "../middleware/audit.middleware";
import { logger } from "../config/logger";

export class SupportController {
  async getTickets(req: AdminRequest, res: Response) {
    try {
      const result = await supportService.getTickets({
        status: req.query.status as any,
        priority: req.query.priority as any,
        category: req.query.category as any,
        assignedTo: req.query.assignedTo as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ error }, "Failed to get tickets");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load tickets" } });
    }
  }

  async getTicket(req: AdminRequest, res: Response) {
    try {
      const ticket = await supportService.getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
      res.json({ success: true, data: ticket });
    } catch (error) {
      logger.error({ error }, "Failed to get ticket");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load ticket" } });
    }
  }

  async updateTicket(req: AdminRequest, res: Response) {
    try {
      const ticket = await supportService.updateTicket(req.params.id, req.body);
      if (req.body.assignedTo) {
        await createAuditLog(req, {
          action: "SUPPORT_ASSIGN",
          targetType: "ticket",
          targetId: req.params.id,
          newValues: { assignedTo: req.body.assignedTo },
        });
      }
      if (req.body.status === "resolved") {
        await createAuditLog(req, {
          action: "SUPPORT_RESOLVE",
          targetType: "ticket",
          targetId: req.params.id,
          newValues: { resolution: req.body.resolution },
        });
      }
      if (req.body.status === "closed") {
        await createAuditLog(req, {
          action: "SUPPORT_CLOSE",
          targetType: "ticket",
          targetId: req.params.id,
        });
      }
      res.json({ success: true, data: ticket });
    } catch (error) {
      logger.error({ error }, "Failed to update ticket");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update ticket" } });
    }
  }
}

export const supportController = new SupportController();

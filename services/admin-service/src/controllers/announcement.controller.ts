// Announcement Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { announcementService } from "../services/announcement.service";
import { createAuditLog } from "../middleware/audit.middleware";
import { logger } from "../config/logger";

export class AnnouncementController {
  async getAll(req: AdminRequest, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const announcements = await announcementService.getAll(includeInactive);
      res.json({ success: true, data: announcements });
    } catch (error) {
      logger.error({ error }, "Failed to get announcements");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load announcements" } });
    }
  }

  async create(req: AdminRequest, res: Response) {
    try {
      const announcement = await announcementService.create({
        ...req.body,
        createdBy: req.adminUser!.userId,
      });
      await createAuditLog(req, {
        action: "ANNOUNCEMENT_CREATE",
        targetType: "announcement",
        targetId: announcement.id,
        newValues: req.body,
      });
      res.status(201).json({ success: true, data: announcement });
    } catch (error) {
      logger.error({ error }, "Failed to create announcement");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create announcement" } });
    }
  }

  async update(req: AdminRequest, res: Response) {
    try {
      const announcement = await announcementService.update(req.params.id, req.body);
      await createAuditLog(req, {
        action: "ANNOUNCEMENT_UPDATE",
        targetType: "announcement",
        targetId: req.params.id,
        newValues: req.body,
      });
      res.json({ success: true, data: announcement });
    } catch (error) {
      logger.error({ error }, "Failed to update announcement");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update announcement" } });
    }
  }

  async delete(req: AdminRequest, res: Response) {
    try {
      await announcementService.delete(req.params.id);
      await createAuditLog(req, {
        action: "ANNOUNCEMENT_DELETE",
        targetType: "announcement",
        targetId: req.params.id,
      });
      res.json({ success: true, message: "Announcement deleted" });
    } catch (error) {
      logger.error({ error }, "Failed to delete announcement");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete announcement" } });
    }
  }
}

export const announcementController = new AnnouncementController();

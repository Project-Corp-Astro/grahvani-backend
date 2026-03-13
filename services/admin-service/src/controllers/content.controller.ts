// Content Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { contentService } from "../services/content.service";
import { createAuditLog } from "../middleware/audit.middleware";
import { logger } from "../config/logger";

export class ContentController {
  async getAll(req: AdminRequest, res: Response) {
    try {
      const contentType = req.query.contentType as any;
      const items = await contentService.getAll(contentType);
      res.json({ success: true, data: items });
    } catch (error) {
      logger.error({ error }, "Failed to get content");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load content" } });
    }
  }

  async create(req: AdminRequest, res: Response) {
    try {
      const item = await contentService.create({
        ...req.body,
        createdBy: req.adminUser!.userId,
      });
      await createAuditLog(req, {
        action: "CONTENT_CREATE",
        targetType: "content",
        targetId: item.id,
        newValues: req.body,
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      logger.error({ error }, "Failed to create content");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create content" } });
    }
  }

  async update(req: AdminRequest, res: Response) {
    try {
      const item = await contentService.update(req.params.id, req.body);
      await createAuditLog(req, {
        action: "CONTENT_UPDATE",
        targetType: "content",
        targetId: req.params.id,
        newValues: req.body,
      });
      res.json({ success: true, data: item });
    } catch (error) {
      logger.error({ error }, "Failed to update content");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update content" } });
    }
  }

  async delete(req: AdminRequest, res: Response) {
    try {
      await contentService.delete(req.params.id);
      await createAuditLog(req, {
        action: "CONTENT_DELETE",
        targetType: "content",
        targetId: req.params.id,
      });
      res.json({ success: true, message: "Content deleted" });
    } catch (error) {
      logger.error({ error }, "Failed to delete content");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete content" } });
    }
  }
}

export const contentController = new ContentController();

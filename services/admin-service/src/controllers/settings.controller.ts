// Settings Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { settingsService } from "../services/settings.service";
import { createAuditLog } from "../middleware/audit.middleware";
import { logger } from "../config/logger";

export class SettingsController {
  async getAll(req: AdminRequest, res: Response) {
    try {
      const category = req.query.category as any;
      const settings = await settingsService.getAll(category);
      res.json({ success: true, data: settings });
    } catch (error) {
      logger.error({ error }, "Failed to get settings");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load settings" } });
    }
  }

  async update(req: AdminRequest, res: Response) {
    try {
      const { key } = req.params;
      const previous = await settingsService.get(key);
      const setting = await settingsService.set(key, req.body.value, req.adminUser!.userId, req.body);
      await createAuditLog(req, {
        action: "SETTING_UPDATE",
        targetType: "setting",
        targetId: setting.id,
        previousValues: previous ? { value: previous.value } : null,
        newValues: { key, value: req.body.value },
      });
      res.json({ success: true, data: setting });
    } catch (error) {
      logger.error({ error }, "Failed to update setting");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update setting" } });
    }
  }

  async bulkUpdate(req: AdminRequest, res: Response) {
    try {
      const result = await settingsService.bulkUpdate(req.body.settings, req.adminUser!.userId);
      res.json({ success: true, data: { updated: result.length } });
    } catch (error) {
      logger.error({ error }, "Failed to bulk update settings");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to bulk update settings" } });
    }
  }

  async delete(req: AdminRequest, res: Response) {
    try {
      await settingsService.delete(req.params.key);
      res.json({ success: true, message: "Setting deleted" });
    } catch (error) {
      logger.error({ error }, "Failed to delete setting");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete setting" } });
    }
  }
}

export const settingsController = new SettingsController();

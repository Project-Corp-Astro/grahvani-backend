// Engine Health Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { engineHealthService } from "../services/engine-health.service";
import { logger } from "../config/logger";

export class EngineHealthController {
  // Get current health status
  async getHealth(req: AdminRequest, res: Response) {
    try {
      const health = await engineHealthService.getHealth();
      res.json({ success: true, data: health });
    } catch (error) {
      logger.error({ error }, "Failed to get engine health");
      res.status(500).json({ 
        error: { code: "INTERNAL_ERROR", message: "Failed to load system health" } 
      });
    }
  }

  // Get historical data for charts
  async getHistory(req: AdminRequest, res: Response) {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const history = await engineHealthService.getHistory(Math.min(hours, 168)); // Max 7 days
      res.json({ success: true, data: history });
    } catch (error) {
      logger.error({ error }, "Failed to get health history");
      res.status(500).json({ 
        error: { code: "INTERNAL_ERROR", message: "Failed to load history" } 
      });
    }
  }

  // Get all alerts
  async getAlerts(req: AdminRequest, res: Response) {
    try {
      const includeResolved = req.query.resolved === "true";
      const alerts = await engineHealthService.getAlerts(includeResolved);
      res.json({ success: true, data: alerts });
    } catch (error) {
      logger.error({ error }, "Failed to get alerts");
      res.status(500).json({ 
        error: { code: "INTERNAL_ERROR", message: "Failed to load alerts" } 
      });
    }
  }

  // Get detailed info for a specific service
  async getServiceDetails(req: AdminRequest, res: Response) {
    try {
      const { name } = req.params;
      const details = await engineHealthService.getServiceDetails(name);
      res.json({ success: true, data: details });
    } catch (error) {
      logger.error({ error }, "Failed to get service details");
      res.status(500).json({ 
        error: { code: "INTERNAL_ERROR", message: "Failed to load service details" } 
      });
    }
  }

  // Test a service endpoint manually
  async testEndpoint(req: AdminRequest, res: Response) {
    try {
      const { name } = req.params;
      const result = await engineHealthService.testEndpoint(name);
      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ error }, "Failed to test endpoint");
      res.status(500).json({ 
        error: { code: "TEST_FAILED", message: error.message } 
      });
    }
  }

  // Get health summary for quick status
  async getSummary(req: AdminRequest, res: Response) {
    try {
      const health = await engineHealthService.getHealth();
      res.json({
        success: true,
        data: {
          status: health.overallStatus,
          online: health.statistics.online,
          total: health.statistics.total,
          avgLatency: health.statistics.avgResponseTime,
          timestamp: health.timestamp,
        },
      });
    } catch (error) {
      logger.error({ error }, "Failed to get health summary");
      res.status(500).json({ 
        error: { code: "INTERNAL_ERROR", message: "Failed to load summary" } 
      });
    }
  }
}

export const engineHealthController = new EngineHealthController();

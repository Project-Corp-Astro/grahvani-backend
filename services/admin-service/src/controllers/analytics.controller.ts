// Analytics Controller — Advanced reporting & data visualization endpoints
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { analyticsService } from "../services/analytics.service";
import { logger } from "../config/logger";
import { getPrismaClient } from "../config/database";

export class AnalyticsController {
  // Get comprehensive analytics
  async getAnalytics(req: AdminRequest, res: Response) {
    try {
      const period = parseInt(req.query.period as string) || 30;
      const data = await analyticsService.getAnalytics(period);
      res.json({ success: true, data });
    } catch (error: any) {
      logger.error({ error }, "Failed to get analytics");
      res.status(500).json({ 
        error: { 
          code: "ANALYTICS_ERROR", 
          message: "Failed to load analytics data" 
        } 
      });
    }
  }

  // Get summary stats only (for dashboard widgets)
  async getSummary(req: AdminRequest, res: Response) {
    try {
      const data = await analyticsService.getAnalytics(7); // Last 7 days
      res.json({
        success: true,
        data: {
          summary: data.summary,
          trends: data.trends,
        }
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to get summary");
      res.status(500).json({ 
        error: { 
          code: "SUMMARY_ERROR", 
          message: "Failed to load summary" 
        } 
      });
    }
  }

  // Export report
  async exportReport(req: AdminRequest, res: Response) {
    try {
      const type = (req.query.type as string) || "full";
      const period = parseInt(req.query.period as string) || 30;
      
      const report = await analyticsService.exportReport(type, period);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
      
      // Convert to CSV
      const csv = [
        report.headers.join(","),
        ...report.rows.map(row => row.join(",")),
      ].join("\n");
      
      res.send(csv);
    } catch (error: any) {
      logger.error({ error }, "Failed to export report");
      res.status(500).json({ 
        error: { 
          code: "EXPORT_ERROR", 
          message: "Failed to export report" 
        } 
      });
    }
  }

  // Get real-time metrics
  async getRealtime(req: AdminRequest, res: Response) {
    try {
      const prisma = getPrismaClient();
      
      // Get current active users (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const [activeNow, subscriptionsToday, todaySubs] = await Promise.all([
        (prisma as any).user?.count({
          where: {
            lastActiveAt: { gte: fiveMinutesAgo }
          }
        }).catch(() => 0) ?? 0,
        prisma.userSubscription.count({
          where: { createdAt: { gte: todayStart } }
        }).catch(() => 0),
        prisma.userSubscription.findMany({
          where: { createdAt: { gte: todayStart } },
          include: { plan: { select: { monthlyPrice: true } } }
        }).catch(() => []),
      ]);

      const revenueToday = todaySubs.reduce((sum: number, sub: any) => {
        return sum + (Number(sub.plan?.monthlyPrice) || 0);
      }, 0);

      res.json({
        success: true,
        data: {
          activeNow,
          subscriptionsToday,
          revenueToday: Math.round(revenueToday),
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      logger.error({ error }, "Failed to get realtime metrics");
      res.status(500).json({ 
        error: { 
          code: "REALTIME_ERROR", 
          message: "Failed to load realtime metrics" 
        } 
      });
    }
  }
}

export const analyticsController = new AnalyticsController();

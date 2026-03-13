// Subscription Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { subscriptionService } from "../services/subscription.service";
import { createAuditLog } from "../middleware/audit.middleware";
import { logger } from "../config/logger";

export class SubscriptionController {
  // ============ PLANS ============

  async getPlans(req: AdminRequest, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const plans = await subscriptionService.getPlans(includeInactive);
      res.json({ success: true, data: plans });
    } catch (error) {
      logger.error({ error }, "Failed to get plans");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load plans" } });
    }
  }

  async getPlan(req: AdminRequest, res: Response) {
    try {
      const plan = await subscriptionService.getPlanById(req.params.id);
      if (!plan) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
      res.json({ success: true, data: plan });
    } catch (error) {
      logger.error({ error }, "Failed to get plan");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load plan" } });
    }
  }

  async createPlan(req: AdminRequest, res: Response) {
    try {
      const plan = await subscriptionService.createPlan(req.body);
      await createAuditLog(req, {
        action: "PLAN_CREATE",
        targetType: "plan",
        targetId: plan.id,
        newValues: req.body,
      });
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      logger.error({ error }, "Failed to create plan");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create plan" } });
    }
  }

  async updatePlan(req: AdminRequest, res: Response) {
    try {
      const existing = await subscriptionService.getPlanById(req.params.id);
      if (!existing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });

      const plan = await subscriptionService.updatePlan(req.params.id, req.body);
      await createAuditLog(req, {
        action: "PLAN_UPDATE",
        targetType: "plan",
        targetId: plan.id,
        previousValues: existing,
        newValues: req.body,
      });
      res.json({ success: true, data: plan });
    } catch (error) {
      logger.error({ error }, "Failed to update plan");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update plan" } });
    }
  }

  async deletePlan(req: AdminRequest, res: Response) {
    try {
      const plan = await subscriptionService.deletePlan(req.params.id);
      await createAuditLog(req, {
        action: "PLAN_DELETE",
        targetType: "plan",
        targetId: req.params.id,
      });
      res.json({ success: true, data: plan });
    } catch (error) {
      logger.error({ error }, "Failed to delete plan");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete plan" } });
    }
  }

  // ============ SUBSCRIPTIONS ============

  async getSubscriptions(req: AdminRequest, res: Response) {
    try {
      const result = await subscriptionService.getSubscriptions({
        status: req.query.status as any,
        planId: req.query.planId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ error }, "Failed to get subscriptions");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load subscriptions" } });
    }
  }

  async assignSubscription(req: AdminRequest, res: Response) {
    try {
      const { userId, userEmail, planId } = req.body;
      if (!userId || !userEmail || !planId) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "userId, userEmail, and planId are required" } });
      }
      const sub = await subscriptionService.assignSubscription({ userId, userEmail, planId });
      await createAuditLog(req, {
        action: "SUBSCRIPTION_ASSIGN",
        targetType: "subscription",
        targetId: sub.id,
        newValues: { userId, planId },
      });
      res.status(201).json({ success: true, data: sub });
    } catch (error: any) {
      logger.error({ error }, "Failed to assign subscription");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message || "Failed to assign subscription" } });
    }
  }

  async cancelSubscription(req: AdminRequest, res: Response) {
    try {
      const sub = await subscriptionService.cancelSubscription(req.params.id, req.body.reason);
      await createAuditLog(req, {
        action: "SUBSCRIPTION_CANCEL",
        targetType: "subscription",
        targetId: req.params.id,
        newValues: { reason: req.body.reason },
      });
      res.json({ success: true, data: sub });
    } catch (error) {
      logger.error({ error }, "Failed to cancel subscription");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to cancel subscription" } });
    }
  }

  async extendSubscription(req: AdminRequest, res: Response) {
    try {
      const days = parseInt(req.body.days);
      if (!days || days <= 0) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Valid number of days required" } });
      }
      const sub = await subscriptionService.extendSubscription(req.params.id, days);
      await createAuditLog(req, {
        action: "SUBSCRIPTION_EXTEND",
        targetType: "subscription",
        targetId: req.params.id,
        newValues: { days },
      });
      res.json({ success: true, data: sub });
    } catch (error) {
      logger.error({ error }, "Failed to extend subscription");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to extend subscription" } });
    }
  }

  // ============ PLATFORM FEATURES ============

  async getPlatformFeatures(req: AdminRequest, res: Response) {
    try {
      const features = await subscriptionService.getPlatformFeatures();
      res.json({ success: true, data: features });
    } catch (error) {
      logger.error({ error }, "Failed to get platform features");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load platform features" } });
    }
  }
}

export const subscriptionController = new SubscriptionController();

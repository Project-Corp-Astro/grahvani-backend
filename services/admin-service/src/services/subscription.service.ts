// Subscription Service — Plan and subscription lifecycle management
import { getPrismaClient } from "../config/database";
import { logger } from "../config/logger";
import { PlanTier, SubscriptionStatus } from "../generated/prisma";
import { featurePolicyService } from "./feature-policy.service";

export class SubscriptionService {
  // ============ PLANS ============

  async getPlans(includeInactive: boolean = false) {
    const prisma = getPrismaClient();
    return prisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { subscriptions: true } },
        features: { include: { feature: true } }
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getPlanById(id: string) {
    const prisma = getPrismaClient();
    return prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
        features: { include: { feature: true } }
      },
    });
  }

  async createPlan(data: {
    name: string;
    slug: string;
    description?: string;
    tier: PlanTier;
    monthlyPrice?: number;
    annualPrice?: number;
    trialDays?: number;
    maxClients?: number;
    maxChartsPerMonth?: number;
    maxReportsPerMonth?: number;
    allowedAyanamsas?: string[];
    allowedChartTypes?: string[];
    allowedDashaSystems?: string[];
    hasKPSystem?: boolean;
    hasMatchmaking?: boolean;
    hasMuhurta?: boolean;
    hasNumerology?: boolean;
    hasReportExport?: boolean;
    hasPDFExport?: boolean;
    hasEmailDelivery?: boolean;
    hasApiAccess?: boolean;
    hasPrioritySupport?: boolean;
    hasWhiteLabel?: boolean;
    featureFlags?: Record<string, any>;
    dynamicFeatures?: Array<{ featureId: string, value: any }>;
  }) {
    const prisma = getPrismaClient();
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        tier: data.tier,
        monthlyPrice: data.monthlyPrice || 0,
        annualPrice: data.annualPrice || 0,
        trialDays: data.trialDays || 0,
        maxClients: data.maxClients || 5,
        maxChartsPerMonth: data.maxChartsPerMonth || 50,
        maxReportsPerMonth: data.maxReportsPerMonth || 5,
        allowedAyanamsas: data.allowedAyanamsas || ["Lahiri"],
        allowedChartTypes: data.allowedChartTypes || ["D1", "D9"],
        allowedDashaSystems: data.allowedDashaSystems || ["vimshottari"],
        hasKPSystem: data.hasKPSystem || false,
        hasMatchmaking: data.hasMatchmaking || false,
        hasMuhurta: data.hasMuhurta || false,
        hasNumerology: data.hasNumerology || false,
        hasReportExport: data.hasReportExport || false,
        hasPDFExport: data.hasPDFExport || false,
        hasEmailDelivery: data.hasEmailDelivery || false,
        hasApiAccess: data.hasApiAccess || false,
        hasPrioritySupport: data.hasPrioritySupport || false,
        hasWhiteLabel: data.hasWhiteLabel || false,
        featureFlags: data.featureFlags || {},
        features: {
          create: data.dynamicFeatures?.map(f => ({
            featureId: f.featureId,
            value: f.value ?? true
          })) || []
        }
      },
    });

    return plan;
  }

  async updatePlan(id: string, data: Record<string, any>) {
    const prisma = getPrismaClient();
    const { dynamicFeatures, ...rest } = data;

    const plan = await prisma.$transaction(async (tx) => {
      const updatedPlan = await tx.subscriptionPlan.update({
        where: { id },
        data: rest,
      });

      if (dynamicFeatures) {
        // Sync dynamic features (delete old ones and re-create for simplicity in this version)
        await tx.planFeature.deleteMany({ where: { planId: id } });
        await tx.planFeature.createMany({
          data: dynamicFeatures.map((f: any) => ({
            planId: id,
            featureId: f.featureId,
            value: f.value ?? true
          }))
        });
      }

      return updatedPlan;
    });

    // Invalidate cache for all users on this plan
    await featurePolicyService.invalidatePlanCache(id);

    return plan;
  }

  async deletePlan(id: string) {
    const prisma = getPrismaClient();
    // Soft delete by marking inactive
    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });

    await featurePolicyService.invalidatePlanCache(id);
    return plan;
  }

  // ============ PLATFORM FEATURES ============

  async getPlatformFeatures() {
    const prisma = getPrismaClient();
    return prisma.platformFeature.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" }
    });
  }

  // ============ SUBSCRIPTIONS ============

  async getSubscriptions(filters?: {
    status?: SubscriptionStatus;
    planId?: string;
    page?: number;
    limit?: number;
  }) {
    const prisma = getPrismaClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status && (filters.status as any) !== "all") where.status = filters.status;
    if (filters?.planId) where.planId = filters.planId;

    const [items, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where,
        include: { plan: { select: { name: true, tier: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.userSubscription.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserSubscription(userId: string) {
    const prisma = getPrismaClient();
    return prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  async assignSubscription(data: {
    userId: string;
    userEmail: string;
    planId: string;
    startNow?: boolean;
  }) {
    const prisma = getPrismaClient();
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) throw new Error("Plan not found");

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const trialEnd = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

    const subscription = await prisma.userSubscription.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        userEmail: data.userEmail,
        planId: data.planId,
        status: trialEnd ? "trialing" : "active",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd || periodEnd,
        trialEnd,
      },
      update: {
        planId: data.planId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: null,
        cancelledAt: null,
        cancelReason: null,
      },
    });

    // Resolve and cache capabilities immediately
    await featurePolicyService.resolveUserCapabilities(data.userId);

    return subscription;
  }

  async cancelSubscription(id: string, reason?: string) {
    const prisma = getPrismaClient();
    return prisma.userSubscription.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
  }

  async extendSubscription(id: string, days: number) {
    const prisma = getPrismaClient();
    const sub = await prisma.userSubscription.findUnique({ where: { id } });
    if (!sub) throw new Error("Subscription not found");

    const newEnd = new Date(sub.currentPeriodEnd);
    newEnd.setDate(newEnd.getDate() + days);

    return prisma.userSubscription.update({
      where: { id },
      data: {
        currentPeriodEnd: newEnd,
        status: "active",
      },
    });
  }
}

export const subscriptionService = new SubscriptionService();

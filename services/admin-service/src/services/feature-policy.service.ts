import { getPrismaClient } from "../config/database";
import { redisService } from "../lib/redis";
import { logger } from "../config/logger";
import { UserCapabilities, FeatureKey } from "@grahvani/contracts";

export class FeaturePolicyService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = "grahvani:caps:";

  /**
   * Resolves the full capability set for a user based on their active subscription.
   * Results are cached in Redis for cross-service consumption.
   */
  async resolveUserCapabilities(userId: string): Promise<UserCapabilities | null> {
    const prisma = getPrismaClient();

    // 1. Fetch user subscription with plan and features
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: {
        plan: {
          include: {
            features: {
              include: { feature: true },
            },
          },
        },
      },
    });

    if (!subscription || !subscription.plan) {
      logger.warn({ userId }, "No active subscription found for capability resolution");
      return null;
    }

    // 2. Map features to simple boolean record
    const features: Record<string, boolean> = {};
    
    // Default features from legacy booleans (for backwards compatibility during migration)
    const plan = subscription.plan as any;
    features[FeatureKey.KP_SYSTEM] = plan.hasKPSystem;
    features[FeatureKey.MATCHMAKING] = plan.hasMatchmaking;
    features[FeatureKey.MUHURTA] = plan.hasMuhurta;
    features[FeatureKey.NUMEROLOGY] = plan.hasNumerology;
    features[FeatureKey.REPORT_EXPORT] = plan.hasReportExport;
    features[FeatureKey.PDF_EXPORT] = plan.hasPDFExport;
    features[FeatureKey.EMAIL_DELIVERY] = plan.hasEmailDelivery;
    features[FeatureKey.API_ACCESS] = plan.hasApiAccess;
    features[FeatureKey.PRIORITY_SUPPORT] = plan.hasPrioritySupport;
    features[FeatureKey.WHITE_LABEL] = plan.hasWhiteLabel;

    // Override with granular dynamic features from new PlatformFeature system
    if (subscription.plan.features) {
      subscription.plan.features.forEach((pf) => {
        const key = pf.feature.featureKey;
        const val = pf.value;
        features[key] = val === true || val === "true" || (typeof val === "object" && val !== null);
      });
    }

    const capabilities: UserCapabilities = {
      planId: subscription.planId,
      planName: subscription.plan.name,
      planTier: subscription.plan.tier as any,
      features: features as any,
      limits: {
        maxClients: subscription.plan.maxClients,
        maxChartsPerMonth: subscription.plan.maxChartsPerMonth,
        maxReportsPerMonth: subscription.plan.maxReportsPerMonth,
      },
    };

    // 3. Cache in Redis for other services (low latency)
    try {
      await redisService.set(
        `${this.CACHE_PREFIX}${userId}`,
        JSON.stringify(capabilities),
        this.CACHE_TTL
      );
    } catch (err) {
      logger.error({ err, userId }, "Failed to cache user capabilities in Redis");
    }

    return capabilities;
  }

  /**
   * Invalidates the cached capabilities for a user.
   * Should be called when subscription or plan changes.
   */
  async invalidateCache(userId: string): Promise<void> {
    await redisService.del(`${this.CACHE_PREFIX}${userId}`);
    logger.debug({ userId }, "Invalidated user capability cache");
  }

  /**
   * Mass invalidation for all users on a specific plan.
   * Should be called when a plan's features are updated.
   */
  async invalidatePlanCache(planId: string): Promise<void> {
    const prisma = getPrismaClient();
    const subs = await prisma.userSubscription.findMany({
      where: { planId },
      select: { userId: true },
    });

    const pipeline = redisService.getClient()?.pipeline();
    if (!pipeline) return;

    subs.forEach((sub) => {
      pipeline.del(`${this.CACHE_PREFIX}${sub.userId}`);
    });

    await pipeline.exec();
    logger.info({ planId, count: subs.length }, "Mass invalidated user capability cache for plan update");
  }
}

export const featurePolicyService = new FeaturePolicyService();

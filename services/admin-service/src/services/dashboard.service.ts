// Dashboard Service — Platform KPI aggregation
import { getPrismaClient } from "../config/database";
import { logger } from "../config/logger";

export class DashboardService {
  async getStats() {
    const prisma = getPrismaClient();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const p = prisma as any;
    
    const [
      totalSubscriptions,
      activeSubscriptions,
      totalPlans,
      openTickets,
      recentAuditLogs,
      totalAstrologers,
      totalAdmins,
      totalClients,
      pendingVerifications,
      newClientsThisMonth,
      newUsersThisWeek,
      newUsersLastWeek,
      newSubscriptionsThisWeek,
      newSubscriptionsLastWeek,
    ] = await Promise.all([
      prisma.userSubscription.count().catch(() => 0),
      prisma.userSubscription.count({ where: { status: "active" } }).catch(() => 0),
      prisma.subscriptionPlan.count({ where: { isActive: true } }).catch(() => 0),
      prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }).catch(() => 0),
      prisma.adminAuditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      p.user?.count({ where: { role: "user" } }).catch(() => 0) ?? 0,
      p.user?.count({ where: { role: { in: ["admin", "moderator"] } } }).catch(() => 0) ?? 0,
      p.client?.count().catch(() => 0) ?? 0,
      p.user?.count({ where: { status: "pending_verification", role: "user" } }).catch(() => 0) ?? 0,
      p.client?.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0) ?? 0,
      p.user?.count({
        where: { role: "user", createdAt: { gte: sevenDaysAgo } }
      }).catch(() => 0) ?? 0,
      p.user?.count({
        where: {
          role: "user",
          createdAt: {
            gte: new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
            lt: sevenDaysAgo
          }
        }
      }).catch(() => 0) ?? 0,
      prisma.userSubscription.count({
        where: { createdAt: { gte: sevenDaysAgo } }
      }).catch(() => 0),
      prisma.userSubscription.count({
        where: {
          createdAt: {
            gte: new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
            lt: sevenDaysAgo
          }
        }
      }).catch(() => 0),
    ]);

    // Calculate total revenue from ALL subscriptions (lifetime)
    const allSubscriptions = await prisma.userSubscription.findMany({
      include: { plan: { select: { monthlyPrice: true } } }
    }).catch(() => []);
    
    const totalRevenue = allSubscriptions.reduce((sum: number, sub: any) => {
      return sum + (Number(sub.plan?.monthlyPrice) || 0);
    }, 0);

    // Subscription distribution
    const planDistribution = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        tier: true,
        monthlyPrice: true,
        _count: { select: { subscriptions: true } },
      },
      orderBy: { sortOrder: "asc" },
    }).catch(() => []);

    // Calculate trends
    const userTrend = newUsersLastWeek > 0
      ? Math.round(((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100)
      : 0;
    const subscriptionTrend = newSubscriptionsLastWeek > 0
      ? Math.round(((newSubscriptionsThisWeek - newSubscriptionsLastWeek) / newSubscriptionsLastWeek) * 100)
      : 0;

    // Get daily stats for sparkline charts (last 7 days)
    const dailyStats = await this.getDailyStats(7);

    // Get recent subscriptions
    const recentSubscriptions = await prisma.userSubscription.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { name: true, tier: true, monthlyPrice: true } }
      }
    }).catch(() => []);

    return {
      kpis: {
        totalSubscriptions,
        activeSubscriptions,
        totalPlans,
        openTickets,
        totalPlatformUsers: totalAstrologers + totalClients,
        totalAstrologers,
        totalClients,
        totalAdmins,
        pendingVerifications,
        newClientsThisMonth,
        totalRevenue: Math.round(totalRevenue),
        newUsersThisWeek,
        newSubscriptionsThisWeek,
        userTrend,
        subscriptionTrend,
      },
      planDistribution: planDistribution.map((p: any) => ({
        planName: p.name,
        tier: p.tier,
        subscribers: p._count.subscriptions,
        price: p.monthlyPrice ? Number(p.monthlyPrice) : 0,
      })),
      recentActivity: recentAuditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        adminEmail: log.adminEmail || "Unknown",
        adminName: null,
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
      recentSubscriptions: recentSubscriptions.map((sub: any) => ({
        id: sub.id,
        userName: sub.userEmail,
        planName: sub.plan?.name,
        tier: sub.plan?.tier,
        amount: Number(sub.plan?.monthlyPrice) || 0,
        status: sub.status,
        createdAt: sub.createdAt,
      })),
      dailyStats,
    };
  }

  async getGrowthData(days: number = 30) {
    const prisma = getPrismaClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const subscriptions = await prisma.userSubscription.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const dailyData: Record<string, { newSubscriptions: number; cumulative: number }> = {};
    
    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateKey = d.toISOString().split("T")[0];
      dailyData[dateKey] = { newSubscriptions: 0, cumulative: 0 };
    }

    // Fill in actual data
    subscriptions.forEach((sub) => {
      const dateKey = sub.createdAt.toISOString().split("T")[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].newSubscriptions++;
      }
    });

    // Calculate cumulative
    let cumulative = 0;
    const result = Object.entries(dailyData).map(([date, data]) => {
      cumulative += data.newSubscriptions;
      return {
        date,
        newSubscriptions: data.newSubscriptions,
        cumulative,
      };
    });

    return result;
  }

  // Get daily stats for sparkline charts
  private async getDailyStats(days: number = 7) {
    const prisma = getPrismaClient();
    const result: { date: string; users: number; subscriptions: number; revenue: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0));
      const dateEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const p = prisma as any;
      
      const [userCount, subCount, daySubs] = await Promise.all([
        p.user?.count({
          where: {
            createdAt: { gte: dateStart, lte: dateEnd },
            role: "user"
          }
        }).catch(() => 0) ?? 0,
        prisma.userSubscription.count({
          where: { createdAt: { gte: dateStart, lte: dateEnd } }
        }).catch(() => 0),
        prisma.userSubscription.findMany({
          where: { createdAt: { gte: dateStart, lte: dateEnd } },
          include: { plan: { select: { monthlyPrice: true } } }
        }).catch(() => []),
      ]);

      const revenue = daySubs.reduce((sum: number, sub: any) => {
        return sum + (Number(sub.plan?.monthlyPrice) || 0);
      }, 0);
      
      result.push({
        date: dateStart.toISOString().split("T")[0],
        users: userCount,
        subscriptions: subCount,
        revenue: Math.round(revenue),
      });
    }
    
    return result;
  }
}

export const dashboardService = new DashboardService();

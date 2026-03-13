// Audit Service — Query audit logs
import { getPrismaClient } from "../config/database";
import { AuditAction } from "../generated/prisma";

export class AuditService {
  async getLogs(filters?: {
    adminId?: string;
    action?: AuditAction;
    targetType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const prisma = getPrismaClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.adminId) where.adminId = filters.adminId;
    if (filters?.action && (filters.action as any) !== "all") where.action = filters.action;
    if (filters?.targetType && (filters.targetType as any) !== "all") where.targetType = filters.targetType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const auditService = new AuditService();

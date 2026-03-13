// Audit Middleware — Auto-logs admin actions
import { Response, NextFunction } from "express";
import { AdminRequest } from "./admin-auth.middleware";
import { getPrismaClient } from "../config/database";
import { logger } from "../config/logger";
import { AuditAction } from "../generated/prisma";

interface AuditContext {
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  previousValues?: any;
  newValues?: any;
}

// Helper to create audit log entries
export async function createAuditLog(
  req: AdminRequest,
  context: AuditContext
): Promise<void> {
  try {
    const prisma = getPrismaClient();
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.adminUser!.userId,
        adminEmail: req.adminUser!.email,
        action: context.action,
        targetType: context.targetType,
        targetId: context.targetId,
        previousValues: context.previousValues,
        newValues: context.newValues,
        ipAddress: (req.ip || req.headers["x-forwarded-for"] as string) || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });
  } catch (error) {
    // Audit logging should never break the request
    logger.error({ error, context }, "Failed to create audit log");
  }
}

// Middleware wrapper for automatic audit logging on mutating routes
export function auditMiddleware(action: AuditAction, targetType: string) {
  return (req: AdminRequest, _res: Response, next: NextFunction) => {
    // Attach audit context to request for controllers to use
    (req as any).auditAction = action;
    (req as any).auditTargetType = targetType;
    next();
  };
}

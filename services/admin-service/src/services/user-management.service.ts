// User Management Service — Super Admin "God Mode" Control
import { getPrismaClient } from "../config/database";
import { logger } from "../config/logger";
import { UserRolePortal, UserStatusPortal } from "../generated/prisma";

export class UserManagementService {
  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const prisma = getPrismaClient();
    const { page = 1, limit = 20, search, role, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && role !== "all") {
      where.role = role as UserRolePortal;
    }

    if (status && status !== "all") {
      where.status = status as UserStatusPortal;
    }

    const [users, total] = await Promise.all([
      (prisma as any).user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      (prisma as any).user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const prisma = getPrismaClient();
    return (prisma as any).user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: { role?: string; status?: string; isVerified?: boolean }) {
    const prisma = getPrismaClient();
    const updateData: any = {};

    if (data.role) updateData.role = data.role as UserRolePortal;
    if (data.status) updateData.status = data.status as UserStatusPortal;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;

    const updatedUser = await (prisma as any).user.update({
      where: { id },
      data: updateData,
    });

    logger.info({ userId: id, updates: data }, "Admin updated user");
    return updatedUser;
  }

  async deleteUser(id: string) {
    const prisma = getPrismaClient();
    // Soft delete by marking as deleted status
    const deletedUser = await (prisma as any).user.update({
      where: { id },
      data: { status: "deleted", deletedAt: new Date() },
    });
    logger.info({ userId: id }, "Admin deleted user");
    return deletedUser;
  }
}

export const userManagementService = new UserManagementService();

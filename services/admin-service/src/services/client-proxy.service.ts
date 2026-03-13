// Client Proxy Service — Admin access to all clients across all astrologers
import { getPrismaClient } from "../config/database";
import { logger } from "../config/logger";

export class ClientProxyService {
  async listClients(query: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
  }) {
    const { page = 1, limit = 20, search, userId } = query;
    const skip = (page - 1) * limit;

    try {
      const prisma = getPrismaClient();
      const where: any = {};

      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { birthPlace: { contains: search, mode: "insensitive" } },
        ];
      }

      if (userId) {
        where.userId = userId;
      }

      const [clients, total] = await Promise.all([
        (prisma as any).client.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
        (prisma as any).client.count({ where }),
      ]);

      return {
        clients,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (err) {
      logger.warn({ err }, "ClientProxy: could not query app_clients schema - it may not be accessible yet");
      return { clients: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  async getClientById(id: string) {
    try {
      const prisma = getPrismaClient();
      return await (prisma as any).client.findUnique({ where: { id } });
    } catch {
      return null;
    }
  }

  async getClientStats() {
    try {
      const prisma = getPrismaClient();
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const [total, newThisMonth] = await Promise.all([
        (prisma as any).client.count(),
        (prisma as any).client.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ]);

      return { totalClients: total, newClientsThisMonth: newThisMonth };
    } catch {
      return { totalClients: 0, newClientsThisMonth: 0 };
    }
  }

  async deleteClient(id: string) {
    try {
      const prisma = getPrismaClient();
      await (prisma as any).client.delete({ where: { id } });
      logger.info({ clientId: id }, "Admin deleted client");
      return true;
    } catch (err) {
      logger.error({ err, clientId: id }, "Failed to delete client");
      throw err;
    }
  }
}

export const clientProxyService = new ClientProxyService();

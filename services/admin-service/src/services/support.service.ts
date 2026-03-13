// Support Ticket Service
import { getPrismaClient } from "../config/database";
import { TicketCategory, TicketStatus, TicketPriority } from "../generated/prisma";

export class SupportService {
  async getTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) {
    const prisma = getPrismaClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status && (filters.status as any) !== "all") where.status = filters.status;
    if (filters?.priority && (filters.priority as any) !== "all") where.priority = filters.priority;
    if (filters?.category && (filters.category as any) !== "all") where.category = filters.category;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;

    const [items, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTicketById(id: string) {
    const prisma = getPrismaClient();
    return prisma.supportTicket.findUnique({ where: { id } });
  }

  async updateTicket(id: string, data: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    resolution?: string;
  }) {
    const prisma = getPrismaClient();
    const updateData: any = { ...data };
    if (data.status === "resolved") {
      updateData.resolvedAt = new Date();
    }
    return prisma.supportTicket.update({ where: { id }, data: updateData });
  }

  async createTicket(data: {
    userId: string;
    userEmail: string;
    userName?: string;
    subject: string;
    description: string;
    category?: TicketCategory;
    priority?: TicketPriority;
  }) {
    const prisma = getPrismaClient();
    return prisma.supportTicket.create({ data });
  }
}

export const supportService = new SupportService();

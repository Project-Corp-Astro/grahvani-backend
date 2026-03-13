// Announcement Service
import { getPrismaClient } from "../config/database";
import { AnnouncementType, TargetAudience } from "../generated/prisma";

export class AnnouncementService {
  async getAll(includeInactive: boolean = false) {
    const prisma = getPrismaClient();
    const where = includeInactive ? {} : { isActive: true };
    return prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
  }

  async create(data: {
    title: string;
    content: string;
    type?: AnnouncementType;
    targetAudience?: TargetAudience;
    startDate?: string;
    endDate?: string;
    isPinned?: boolean;
    dismissible?: boolean;
    createdBy: string;
  }) {
    const prisma = getPrismaClient();
    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || "info",
        targetAudience: data.targetAudience || "all",
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isPinned: data.isPinned || false,
        dismissible: data.dismissible !== false,
        createdBy: data.createdBy,
      },
    });
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = getPrismaClient();
    return prisma.announcement.update({ where: { id }, data });
  }

  async delete(id: string) {
    const prisma = getPrismaClient();
    return prisma.announcement.delete({ where: { id } });
  }
}

export const announcementService = new AnnouncementService();

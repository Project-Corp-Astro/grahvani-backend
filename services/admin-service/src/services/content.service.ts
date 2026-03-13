// Content Override Service
import { getPrismaClient } from "../config/database";
import { ContentType } from "../generated/prisma";

export class ContentService {
  async getAll(contentType?: ContentType) {
    const prisma = getPrismaClient();
    const where = (contentType && (contentType as any) !== "all") ? { contentType } : {};
    return prisma.contentOverride.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    contentType: ContentType;
    contentKey: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
    createdBy: string;
  }) {
    const prisma = getPrismaClient();
    return prisma.contentOverride.create({ data: { ...data, metadata: data.metadata || {} } });
  }

  async update(id: string, data: Record<string, any>) {
    const prisma = getPrismaClient();
    return prisma.contentOverride.update({ where: { id }, data });
  }

  async delete(id: string) {
    const prisma = getPrismaClient();
    return prisma.contentOverride.delete({ where: { id } });
  }
}

export const contentService = new ContentService();

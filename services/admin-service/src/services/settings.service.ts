// Settings Service — Platform configuration management
import { getPrismaClient } from "../config/database";
import { SettingCategory } from "../generated/prisma";

export class SettingsService {
  async getAll(category?: SettingCategory) {
    const prisma = getPrismaClient();
    const where = category ? { category } : {};
    return prisma.platformSetting.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  async get(key: string) {
    const prisma = getPrismaClient();
    return prisma.platformSetting.findUnique({ where: { key } });
  }

  async set(key: string, value: any, adminId: string, options?: {
    category?: SettingCategory;
    description?: string;
    isSecret?: boolean;
  }) {
    const prisma = getPrismaClient();
    return prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category: options?.category || "general",
        description: options?.description,
        isSecret: options?.isSecret || false,
        updatedBy: adminId,
      },
      update: {
        value,
        updatedBy: adminId,
        ...(options?.description && { description: options.description }),
      },
    });
  }

  async delete(key: string) {
    const prisma = getPrismaClient();
    return prisma.platformSetting.delete({ where: { key } });
  }

  async bulkUpdate(settings: Array<{ key: string; value: any }>, adminId: string) {
    const prisma = getPrismaClient();
    return prisma.$transaction(
      settings.map((s) =>
        prisma.platformSetting.upsert({
          where: { key: s.key },
          create: {
            key: s.key,
            value: s.value,
            updatedBy: adminId,
          },
          update: {
            value: s.value,
            updatedBy: adminId,
          },
        })
      )
    );
  }
}

export const settingsService = new SettingsService();

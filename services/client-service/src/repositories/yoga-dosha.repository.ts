import { YogaDoshaCategory } from "../generated/prisma";
import { getPrismaClient } from "../config/database";

// LAZY: Prisma accessed via getPrismaClient() inside methods, NOT at module load time

export class YogaDoshaRepository {
  /**
   * Upsert a yoga/dosha record.
   * Uses unique constraint: [tenantId, clientId, category, type, system]
   */
  async upsert(
    tenantId: string,
    data: {
      clientId: string;
      category: YogaDoshaCategory;
      type: string;
      isPresent: boolean;
      system: string;
      analysisData: any;
      calculatedAt: Date;
    },
  ) {
    return getPrismaClient().clientYogaDosha.upsert({
      where: {
        tenantId_clientId_category_type_system: {
          tenantId,
          clientId: data.clientId,
          category: data.category,
          type: data.type,
          system: data.system,
        },
      },
      update: {
        isPresent: data.isPresent,
        analysisData: data.analysisData,
        calculatedAt: data.calculatedAt,
      },
      create: { ...data, tenantId },
    });
  }

  /**
   * Find yoga/doshas for a client (with optional filters)
   */
  async findByClient(
    tenantId: string,
    clientId: string,
    filters?: {
      category?: YogaDoshaCategory;
      isPresent?: boolean;
      system?: string;
    },
  ) {
    const where: any = { tenantId, clientId };
    if (filters?.category) where.category = filters.category;
    if (filters?.isPresent !== undefined) where.isPresent = filters.isPresent;
    if (filters?.system) where.system = filters.system;

    return getPrismaClient().clientYogaDosha.findMany({
      where,
      orderBy: [{ category: "asc" }, { type: "asc" }],
    });
  }

  /**
   * Delete all yoga/doshas for a client (used during regeneration)
   */
  async deleteByClientId(tenantId: string, clientId: string) {
    return getPrismaClient().clientYogaDosha.deleteMany({
      where: { clientId, tenantId },
    });
  }
}

export const yogaDoshaRepository = new YogaDoshaRepository();

import { RemedyType, RemedyStatus } from "../generated/prisma";
import { getPrismaClient } from "../config/database";

// LAZY: Prisma accessed via getPrismaClient() inside methods, NOT at module load time

export class RemedyRepository {
  /**
   * Find remedies for a client
   */
  async findByClientId(tenantId: string, clientId: string) {
    return getPrismaClient().clientRemedy.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find remedies for a specific consultation
   */
  async findByConsultationId(tenantId: string, consultationId: string) {
    return getPrismaClient().clientRemedy.findMany({
      where: { tenantId, consultationId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create a remedy
   */
  async create(
    tenantId: string,
    data: {
      clientId: string;
      consultationId?: string;
      remedyType: RemedyType;
      remedyTitle: string;
      remedyDescription?: string;
      instructions?: string;
      startDate?: Date;
      endDate?: Date;
      status?: RemedyStatus;
      createdBy?: string;
    },
  ) {
    return getPrismaClient().clientRemedy.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Update remedy status or notes
   */
  async update(tenantId: string, id: string, data: any) {
    return getPrismaClient().clientRemedy.update({
      where: { id, tenantId },
      data,
    });
  }
}

export const remedyRepository = new RemedyRepository();

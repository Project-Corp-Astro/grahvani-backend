import { ConsultationType, ConsultationStatus } from "../generated/prisma";
import { getPrismaClient } from "../config/database";

// LAZY: Prisma accessed via getPrismaClient() inside methods, NOT at module load time

export class HistoryRepository {
  /**
   * Find consultations for a client
   */
  async findByClientId(tenantId: string, clientId: string) {
    return getPrismaClient().clientConsultation.findMany({
      where: { tenantId, clientId },
      orderBy: { consultationDate: "desc" },
      include: {
        remedies: true,
      },
    });
  }

  /**
   * Create consultation record
   */
  async create(
    tenantId: string,
    data: {
      clientId: string;
      bookingId?: string;
      reportId?: string;
      consultationType: ConsultationType;
      sessionNotes?: string;
      keyObservations?: string;
      followUpDate?: Date;
      status?: ConsultationStatus;
      consultationDate: Date;
      createdBy?: string;
    },
  ) {
    return getPrismaClient().clientConsultation.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Update consultation
   */
  async update(tenantId: string, id: string, data: any) {
    return getPrismaClient().clientConsultation.update({
      where: { id, tenantId },
      data,
    });
  }
}

export const historyRepository = new HistoryRepository();

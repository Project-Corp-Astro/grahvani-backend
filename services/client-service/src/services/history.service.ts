import { historyRepository } from "../repositories/history.repository";
import { clientRepository } from "../repositories/client.repository";
import { ClientNotFoundError } from "../errors/client.errors";
import { eventPublisher } from "./event.publisher";
import { activityService } from "./activity.service";
import { RequestMetadata } from "./client.service";
import { logger } from "../config";

export class HistoryService {
  /**
   * Log a new consultation
   */
  async addConsultation(tenantId: string, clientId: string, data: any, metadata: RequestMetadata) {
    // 1. Check client
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    // 2. Create history record
    const consultation = await historyRepository.create(tenantId, {
      ...data,
      clientId,
      consultationDate: data.consultationDate ? new Date(data.consultationDate) : new Date(),
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      createdBy: metadata.userId,
    });

    // 3. Record activity
    await activityService.recordActivity({
      tenantId,
      clientId,
      userId: metadata.userId,
      action: "client.consultation_added",
      details: {
        consultationId: consultation.id,
        type: consultation.consultationType,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // 4. Publish event
    await eventPublisher.publish("client.consultation_added", {
      clientId,
      tenantId,
      data: {
        consultationId: consultation.id,
        type: consultation.consultationType,
      },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info(
      { tenantId, clientId, consultationId: consultation.id },
      "Consultation history added",
    );

    return consultation;
  }

  /**
   * Get history for client
   */
  async getClientHistory(tenantId: string, clientId: string) {
    return historyRepository.findByClientId(tenantId, clientId);
  }
}

export const historyService = new HistoryService();

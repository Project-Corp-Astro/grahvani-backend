import { remedyRepository } from "../repositories/remedy.repository";
import { clientRepository } from "../repositories/client.repository";
import { ClientNotFoundError } from "../errors/client.errors";
import { eventPublisher } from "./event.publisher";
import { activityService } from "./activity.service";
import { RequestMetadata } from "./client.service";
import { logger } from "../config";

export class RemedyService {
  /**
   * Prescribe a remedy for a client
   */
  async prescribeRemedy(tenantId: string, clientId: string, data: any, metadata: RequestMetadata) {
    const client = await clientRepository.findById(tenantId, clientId);
    if (!client) throw new ClientNotFoundError(clientId);

    const remedy = await remedyRepository.create(tenantId, {
      ...data,
      clientId,
      createdBy: metadata.userId,
    });

    // Record activity
    await activityService.recordActivity({
      tenantId,
      clientId,
      userId: metadata.userId,
      action: "client.remedy_prescribed",
      details: {
        remedyId: remedy.id,
        type: remedy.remedyType,
        title: remedy.remedyTitle,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // Publish event
    await eventPublisher.publish("client.remedy_prescribed", {
      clientId,
      tenantId,
      data: {
        remedyId: remedy.id,
        type: remedy.remedyType,
        title: remedy.remedyTitle,
      },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info({ tenantId, clientId, remedyId: remedy.id }, "Remedy prescribed to client");

    return remedy;
  }

  /**
   * Get remedies for client
   */
  async getClientRemedies(tenantId: string, clientId: string) {
    return remedyRepository.findByClientId(tenantId, clientId);
  }

  /**
   * Update remedy status
   */
  async updateRemedyStatus(tenantId: string, id: string, status: any, metadata: RequestMetadata) {
    const updated = await remedyRepository.update(tenantId, id, { status });

    // Record activity
    await activityService.recordActivity({
      tenantId,
      clientId: updated.clientId,
      userId: metadata.userId,
      action: "client.remedy_status_updated",
      details: { remedyId: id, status },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // Publish event
    await eventPublisher.publish("client.remedy_status_updated", {
      clientId: updated.clientId,
      tenantId,
      data: { remedyId: id, status },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info({ tenantId, remedyId: id, status }, "Remedy status updated");
    return updated;
  }
}

export const remedyService = new RemedyService();

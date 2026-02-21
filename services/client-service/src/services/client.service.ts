import { clientRepository } from "../repositories/client.repository";
import { chartRepository } from "../repositories/chart.repository";
import { yogaDoshaRepository } from "../repositories/yoga-dosha.repository";
import {
  ClientNotFoundError,
  DuplicateClientError,
} from "../errors/client.errors";
import {
  CreateClientSchema,
  UpdateClientSchema,
} from "../validators/client.validator";
import { geocodeService } from "./geocode.service";
import { eventPublisher } from "./event.publisher";
import { activityService } from "./activity.service";
import { chartService } from "./chart.service";
import { logger } from "../config";

export interface RequestMetadata {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceName?: string;
}

export class ClientService {
  /**
   * Get all clients for a tenant
   */
  async getAllClients(tenantId: string, query: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      clientRepository.findMany(tenantId, {
        skip,
        take: limit,
        searchTerm: query.search as string,
        sortBy: query.sortBy as string,
        sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
        createdBy: query.myClientsOnly === "true" ? query.userId : undefined,
        gender: query.gender,
        maritalStatus: query.maritalStatus,
        city: query.city,
        tags: query.tags
          ? Array.isArray(query.tags)
            ? query.tags
            : [query.tags]
          : undefined,
      }),
      clientRepository.count(tenantId, {
        searchTerm: query.search as string,
        createdBy: query.myClientsOnly === "true" ? query.userId : undefined,
        gender: query.gender,
        maritalStatus: query.maritalStatus,
        city: query.city,
        tags: query.tags
          ? Array.isArray(query.tags)
            ? query.tags
            : [query.tags]
          : undefined,
      }),
    ]);

    return {
      clients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get client details
   */
  async getClient(tenantId: string, id: string, metadata?: RequestMetadata) {
    const client = await clientRepository.findById(tenantId, id);
    if (!client) {
      throw new ClientNotFoundError(id);
    }

    // Pre-emptive technical audit and generation whenever a client is selected
    // This ensures charts are ready before the user clicks on specific astrology tabs
    if (metadata && client.birthDate) {
      chartService.ensureFullVedicProfile(tenantId, id, metadata);
    }

    return client;
  }

  /**
   * Create new client
   */
  async createClient(tenantId: string, data: any, metadata: RequestMetadata) {
    // 1. Validate data
    const validatedData = CreateClientSchema.parse(data);

    // 2. Check for duplicates
    const existing = await clientRepository.findUnique(tenantId, {
      email: validatedData.email,
      phonePrimary: validatedData.phonePrimary,
    });

    if (existing) {
      const field = existing.email === validatedData.email ? "email" : "phone";
      const value =
        (field === "email" ? existing.email : existing.phonePrimary) ||
        "unknown";
      throw new DuplicateClientError(field, value);
    }

    // 3. Generate client code (CL-TIMESTAMP-RANDOM)
    const clientCode = `CL-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    // 4. Geocode if birthPlace is provided but coords/tz are missing
    const clientData = { ...validatedData };
    if (
      clientData.birthPlace &&
      (clientData.birthLatitude === undefined ||
        clientData.birthLatitude === null ||
        clientData.birthLongitude === undefined ||
        clientData.birthLongitude === null)
    ) {
      try {
        const geo = await geocodeService.geocodeBirthPlace(
          clientData.birthPlace,
        );
        clientData.birthLatitude = geo.latitude;
        clientData.birthLongitude = geo.longitude;
        clientData.birthTimezone = geo.timezone;
      } catch (err) {
        logger.warn(
          { err, place: clientData.birthPlace },
          "Geocoding failed during client creation",
        );
      }
    }

    // 5. Build prisma data, omitting internal flags
    const clientDataOnly = { ...clientData };
    delete (clientDataOnly as any).system;
    delete (clientDataOnly as any).generateInitialChart;
    const prismaData: any = {
      ...clientDataOnly,
      clientCode,
      createdBy: metadata.userId,
    };

    // Prisma expects Date object, not string
    if (prismaData.birthDate && typeof prismaData.birthDate === "string") {
      prismaData.birthDate = new Date(prismaData.birthDate);
    }

    // 3. Handle data conversions for Prisma
    if (prismaData.birthTime && typeof prismaData.birthTime === "string") {
      if (prismaData.birthTime.includes("T")) {
        prismaData.birthTime = new Date(prismaData.birthTime);
      } else {
        // Create a dummy date with the provided time
        // CRITICAL: Treat "HH:mm:ss" as UTC face value to avoid timezone shifts
        const [hours, minutes, seconds] = prismaData.birthTime
          .split(":")
          .map(Number);
        const timeDate = new Date();
        timeDate.setUTCHours(hours, minutes, seconds || 0, 0); // Use UTC setters
        prismaData.birthTime = timeDate;
      }
    }

    // 6. Create client
    const client = await clientRepository.create(tenantId, prismaData);

    // 6. Record activity
    await activityService.recordActivity({
      tenantId,
      clientId: client.id,
      userId: metadata.userId,
      action: "client.created",
      details: { clientCode: client.clientCode, fullName: client.fullName },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // 7. Publish event
    await eventPublisher.publish("client.created", {
      clientId: client.id,
      tenantId,
      data: { clientCode: client.clientCode, fullName: client.fullName },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    // 8. Generate initial charts in BACKGROUND (fire-and-forget)
    // Client creation returns IMMEDIATELY - charts generate asynchronously
    if (validatedData.generateInitialChart && client.birthDate) {
      // DO NOT AWAIT - fire and forget for instant client creation
      chartService
        .generateFullVedicProfile(tenantId, client.id, metadata)
        .then(() =>
          logger.info(
            { clientId: client.id },
            "Background chart generation completed",
          ),
        )
        .catch((err: any) =>
          logger.error(
            { err, clientId: client.id },
            "Background chart generation failed",
          ),
        );
    }

    logger.info(
      { tenantId, clientId: client.id },
      "Client created successfully (charts generating in background)",
    );

    return client;
  }

  /**
   * Update client
   */
  async updateClient(
    tenantId: string,
    id: string,
    data: any,
    metadata: RequestMetadata,
  ) {
    // 1. Check existence
    const existing = await clientRepository.findById(tenantId, id);
    if (!existing) {
      throw new ClientNotFoundError(id);
    }

    // 2. Validate update data
    const validatedData = UpdateClientSchema.parse(data);

    // 3. Convert birthDate/birthTime strings to Date objects for Prisma
    const prismaData: any = { ...validatedData };

    if (prismaData.birthDate && typeof prismaData.birthDate === "string") {
      prismaData.birthDate = new Date(prismaData.birthDate);
    }

    if (prismaData.birthTime && typeof prismaData.birthTime === "string") {
      if (prismaData.birthTime.includes("T")) {
        prismaData.birthTime = new Date(prismaData.birthTime);
      } else {
        // Create a dummy date with the provided time
        // CRITICAL: Treat "HH:mm:ss" as UTC face value to avoid timezone shifts (matching createClient)
        const [hours, minutes, seconds] = prismaData.birthTime
          .split(":")
          .map(Number);
        const timeDate = new Date();
        timeDate.setUTCHours(hours, minutes, seconds || 0, 0); // Use UTC setters
        prismaData.birthTime = timeDate;
      }
    }

    // 4. Perform update
    // Ensure "notes" is passed through if provided in data
    if (data.notes !== undefined) {
      prismaData.notes = data.notes;
    }

    const updatedClient = await clientRepository.update(
      tenantId,
      id,
      prismaData,
    );

    // 5. Check if birth details OR name changed to trigger chart regeneration
    // This indicates a "Critical Update" where old charts are invalidated
    const isChartRegenerationTriggered =
      (prismaData.fullName && existing.fullName !== prismaData.fullName) ||
      (prismaData.birthDate &&
        existing.birthDate?.getTime() !== prismaData.birthDate.getTime()) ||
      (prismaData.birthTime &&
        existing.birthTime?.getTime() !== prismaData.birthTime.getTime()) ||
      (prismaData.birthLatitude &&
        existing.birthLatitude !== prismaData.birthLatitude) ||
      (prismaData.birthLongitude &&
        existing.birthLongitude !== prismaData.birthLongitude) ||
      (prismaData.birthTimezone &&
        existing.birthTimezone !== prismaData.birthTimezone);

    if (isChartRegenerationTriggered) {
      try {
        logger.info(
          { tenantId, clientId: id },
          "Critical details updated - Performing clean chart regeneration",
        );

        // Update status to pending immediately so UI shows "Generatin..." state
        await clientRepository.update(tenantId, id, {
          generationStatus: "pending",
        } as any);

        // CRITICAL: Delete old charts first to ensure data consistency
        // We lock briefly to ensure no parallel generation is happening right now
        // const { generationLocks } = require("./chart.service");

        // If a generation is currently running, we can't easily stop it, but we can clear the data
        // Ideally we should wait, but for now we proceed with deletion
        await chartRepository.deleteByClientId(tenantId, id);
        await yogaDoshaRepository.deleteByClientId(tenantId, id);
        logger.info({ tenantId, clientId: id }, "Verified: Old charts deleted");

        // Run full profile generation in background
        chartService
          .generateFullVedicProfile(tenantId, id, metadata)
          .catch((err) => {
            logger.error(
              { err, clientId: id },
              "Background chart regeneration failed after update",
            );
          });
      } catch (err) {
        logger.error(
          { err, clientId: id },
          "Failed to initiate chart regeneration",
        );
      }
    }

    // 4. Record activity
    await activityService.recordActivity({
      tenantId,
      clientId: id,
      userId: metadata.userId,
      action: "client.updated",
      details: { changes: Object.keys(validatedData) },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      deviceType: metadata.deviceType,
      deviceName: metadata.deviceName,
    });

    // 5. Publish event
    await eventPublisher.publish("client.updated", {
      clientId: id,
      tenantId,
      data: { changes: Object.keys(validatedData) },
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info({ tenantId, clientId: id }, "Client updated successfully");

    return updatedClient;
  }

  /**
   * Delete client (soft delete)
   */
  async deleteClient(tenantId: string, id: string, metadata: RequestMetadata) {
    const existing = await clientRepository.findById(tenantId, id);
    if (!existing) {
      throw new ClientNotFoundError(id);
    }

    // Signal background generations to stop immediately
    const { generationLocks, abortedClients } = await import("./chart.service");
    abortedClients.add(id);
    generationLocks.delete(id); // Take over the lock

    try {
      // PHASE 1: Mark as 'failed' (proxy for deleting) to enforce DB-level short-circuit
      // We use 'failed' because we cannot easily alter the Postgres Enum on Supabase without owner permissions
      await clientRepository.update(tenantId, id, {
        generationStatus: "failed",
      } as any);

      // PHASE 2: Perform permanent hard delete with high timeout
      await clientRepository.delete(tenantId, id);

      // Record activity (do NOT link clientId as FK, because it's deleted)
      await activityService.recordActivity({
        tenantId,
        clientId: undefined, // Prevent FK violation
        userId: metadata.userId,
        action: "client.deleted",
        details: { deletedClientId: id },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      });

      // Publish event
      await eventPublisher.publish("client.deleted", {
        clientId: id,
        tenantId,
        metadata: {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          deviceType: metadata.deviceType,
          deviceName: metadata.deviceName,
        },
      });

      logger.info(
        { tenantId, clientId: id },
        "Client permanently deleted successfully",
      );

      return { success: true };
    } finally {
      // Always release lock and abort signal so we don't leak memory even if delete failed
      generationLocks.delete(id);
      abortedClients.delete(id);
    }
  }
}

export const clientService = new ClientService();

import { clientRepository } from '../repositories/client.repository';
import { ClientNotFoundError, DuplicateClientError } from '../errors/client.errors';
import { CreateClientSchema, UpdateClientSchema } from '../validators/client.validator';
import { geocodeService } from './geocode.service';
import { eventPublisher } from './event.publisher';
import { activityService } from './activity.service';
import { chartService } from './chart.service';
import { logger } from '../config';

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
                sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
                createdBy: query.myClientsOnly === 'true' ? query.userId : undefined,
                gender: query.gender,
                maritalStatus: query.maritalStatus,
                city: query.city,
                tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
            }),
            clientRepository.count(tenantId, {
                searchTerm: query.search as string,
                createdBy: query.myClientsOnly === 'true' ? query.userId : undefined,
                gender: query.gender,
                maritalStatus: query.maritalStatus,
                city: query.city,
                tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
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
    async getClient(tenantId: string, id: string) {
        const client = await clientRepository.findById(tenantId, id);
        if (!client) {
            throw new ClientNotFoundError(id);
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
            const field = existing.email === validatedData.email ? 'email' : 'phone';
            const value = (field === 'email' ? existing.email : existing.phonePrimary) || 'unknown';
            throw new DuplicateClientError(field, value);
        }

        // 3. Generate client code (CL-TIMESTAMP-RANDOM)
        const clientCode = `CL-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        // 4. Geocode if birthPlace is provided but coords/tz are missing
        const clientData = { ...validatedData };
        if (clientData.birthPlace && (!clientData.birthLatitude || !clientData.birthLongitude)) {
            try {
                const geo = await geocodeService.geocodeBirthPlace(clientData.birthPlace);
                clientData.birthLatitude = geo.latitude;
                clientData.birthLongitude = geo.longitude;
                clientData.birthTimezone = geo.timezone;
            } catch (err) {
                logger.warn({ err, place: clientData.birthPlace }, 'Geocoding failed during client creation');
            }
        }

        // 5. Build prisma data, omitting internal flags
        const { system, generateInitialChart, ...clientDataOnly } = clientData;
        const prismaData: any = {
            ...clientDataOnly,
            clientCode,
            createdBy: metadata.userId,
        };

        // Prisma expects Date object, not string
        if (prismaData.birthDate && typeof prismaData.birthDate === 'string') {
            prismaData.birthDate = new Date(prismaData.birthDate);
        }

        if (prismaData.birthTime && typeof prismaData.birthTime === 'string') {
            if (prismaData.birthTime.includes('T')) {
                prismaData.birthTime = new Date(prismaData.birthTime);
            } else {
                // Create a dummy date with the provided time
                const [hours, minutes, seconds] = prismaData.birthTime.split(':').map(Number);
                const timeDate = new Date();
                timeDate.setHours(hours, minutes, seconds || 0, 0);
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
            action: 'client.created',
            details: { clientCode: client.clientCode, fullName: client.fullName },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // 7. Publish event
        await eventPublisher.publish('client.created', {
            clientId: client.id,
            tenantId,
            data: { clientCode: client.clientCode, fullName: client.fullName },
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        // 8. Generate initial chart if requested
        if (validatedData.generateInitialChart && client.birthDate) {
            try {
                logger.info({ tenantId, clientId: client.id }, 'Triggering initial chart generation');
                await chartService.generateAndSaveChart(
                    tenantId,
                    client.id,
                    'D1',
                    validatedData.system || 'lahiri',
                    metadata
                );
            } catch (err: any) {
                logger.error({ err, clientId: client.id }, 'Initial chart generation failed');
                // We don't throw here to avoid failing the whole registration
            }
        }

        logger.info({ tenantId, clientId: client.id }, 'Client created successfully');

        return client;
    }

    /**
     * Update client
     */
    async updateClient(tenantId: string, id: string, data: any, metadata: RequestMetadata) {
        // 1. Check existence
        const existing = await clientRepository.findById(tenantId, id);
        if (!existing) {
            throw new ClientNotFoundError(id);
        }

        // 2. Validate update data
        const validatedData = UpdateClientSchema.parse(data);

        // 3. Convert birthDate/birthTime strings to Date objects for Prisma
        const prismaData: any = { ...validatedData };

        if (prismaData.birthDate && typeof prismaData.birthDate === 'string') {
            prismaData.birthDate = new Date(prismaData.birthDate);
        }

        if (prismaData.birthTime && typeof prismaData.birthTime === 'string') {
            if (prismaData.birthTime.includes('T')) {
                prismaData.birthTime = new Date(prismaData.birthTime);
            } else {
                // Create a dummy date with the provided time
                const [hours, minutes, seconds] = prismaData.birthTime.split(':').map(Number);
                const timeDate = new Date();
                timeDate.setHours(hours, minutes, seconds || 0, 0);
                prismaData.birthTime = timeDate;
            }
        }

        // 4. Perform update
        const updatedClient = await clientRepository.update(tenantId, id, prismaData);

        // 4. Record activity
        await activityService.recordActivity({
            tenantId,
            clientId: id,
            userId: metadata.userId,
            action: 'client.updated',
            details: { changes: Object.keys(validatedData) },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // 5. Publish event
        await eventPublisher.publish('client.updated', {
            clientId: id,
            tenantId,
            data: { changes: Object.keys(validatedData) },
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        logger.info({ tenantId, clientId: id }, 'Client updated successfully');

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

        // Implement "Rename on Delete" to free up unique fields (email, phone)
        const suffix = `-deleted-${Date.now()}`;
        const updateData: any = {};

        if (existing.email) {
            updateData.email = `${existing.email}${suffix}`;
        }

        if (existing.phonePrimary) {
            updateData.phonePrimary = `${existing.phonePrimary}${suffix}`;
        }

        await clientRepository.softDelete(tenantId, id, updateData);

        // Record activity
        await activityService.recordActivity({
            tenantId,
            clientId: id,
            userId: metadata.userId,
            action: 'client.deleted',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // Publish event
        await eventPublisher.publish('client.deleted', {
            clientId: id,
            tenantId,
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        logger.info({ tenantId, clientId: id }, 'Client soft-deleted successfully');

        return { success: true };
    }
}

export const clientService = new ClientService();

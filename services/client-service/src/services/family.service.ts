import { familyRepository } from '../repositories/family.repository';
import { clientRepository } from '../repositories/client.repository';
import { ClientNotFoundError } from '../errors/client.errors';
import { RelationshipType } from '../generated/prisma';
import { FamilyLinkSchema } from '../validators/client.validator';
import { eventPublisher } from './event.publisher';
import { activityService } from './activity.service';
import { RequestMetadata } from './client.service';
import { logger } from '../config';

export class FamilyService {
    /**
     * Link two clients
     */
    async linkFamilyMember(tenantId: string, clientId: string, data: any, metadata: RequestMetadata) {
        // 1. Validate input
        const validated = FamilyLinkSchema.parse(data);

        // 2. Check existence of both clients
        const [client, relatedClient] = await Promise.all([
            clientRepository.findById(tenantId, clientId),
            clientRepository.findById(tenantId, validated.relatedClientId)
        ]);

        if (!client) throw new ClientNotFoundError(clientId);
        if (!relatedClient) throw new ClientNotFoundError(validated.relatedClientId);

        // 3. Determine reciprocal relationship
        const reciprocalType = this.getReciprocalType(validated.relationshipType as RelationshipType);

        // 4. Create bidirectional links
        await familyRepository.createBidirectional(
            tenantId,
            {
                clientId,
                relatedClientId: validated.relatedClientId,
                relationshipType: validated.relationshipType as RelationshipType,
                relationshipLabel: validated.relationshipLabel,
                notes: validated.notes,
                createdBy: metadata.userId
            },
            {
                clientId: validated.relatedClientId,
                relatedClientId: clientId,
                relationshipType: reciprocalType,
                notes: validated.notes,
                createdBy: metadata.userId
            }
        );

        // 5. Record activity
        await activityService.recordActivity({
            tenantId,
            clientId,
            userId: metadata.userId,
            action: 'client.family_linked',
            details: {
                relatedClientId: validated.relatedClientId,
                relationship: validated.relationshipType
            },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // 6. Publish event
        await eventPublisher.publish('client.family_linked', {
            clientId,
            tenantId,
            data: {
                relatedClientId: validated.relatedClientId,
                relationship: validated.relationshipType
            },
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        logger.info({ tenantId, clientId, relatedId: validated.relatedClientId }, 'Family link established');

        return { success: true };
    }

    /**
     * Get family ties for a client
     */
    async getFamilyLinks(tenantId: string, clientId: string) {
        return familyRepository.findAllForClient(tenantId, clientId);
    }

    /**
     * Remove family link
     */
    async removeFamilyLink(tenantId: string, clientId: string, relatedClientId: string, metadata: RequestMetadata) {
        await familyRepository.delete(tenantId, clientId, relatedClientId);

        // Record activity
        await activityService.recordActivity({
            tenantId,
            clientId,
            userId: metadata.userId,
            action: 'client.family_unlinked',
            details: { relatedClientId },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // Publish event
        await eventPublisher.publish('client.family_unlinked', {
            clientId,
            tenantId,
            data: { relatedClientId },
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                deviceType: metadata.deviceType,
                deviceName: metadata.deviceName,
            }
        });

        logger.info({ tenantId, clientId, relatedId: relatedClientId }, 'Family link removed');
        return { success: true };
    }

    /**
     * Reciprocal mapping
     */
    private getReciprocalType(type: RelationshipType): RelationshipType {
        const map: Partial<Record<RelationshipType, RelationshipType>> = {
            spouse: 'spouse',
            parent: 'child',
            child: 'parent',
            sibling: 'sibling',
            grandparent: 'grandchild',
            grandchild: 'grandparent',
            in_law: 'in_law',
            uncle_aunt: 'nephew_niece',
            nephew_niece: 'uncle_aunt',
            cousin: 'cousin',
            other: 'other'
        };

        return map[type] || 'other';
    }
}

export const familyService = new FamilyService();

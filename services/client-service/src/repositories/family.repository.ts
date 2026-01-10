import { PrismaClient, ClientFamilyLink, RelationshipType } from '../generated/prisma';

const prisma = new PrismaClient();

export class FamilyRepository {
    /**
     * Find all family links for a client
     */
    async findAllForClient(tenantId: string, clientId: string) {
        return prisma.clientFamilyLink.findMany({
            where: { tenantId, clientId },
            include: {
                relatedClient: true
            }
        });
    }

    /**
     * Create family link
     */
    async create(tenantId: string, data: {
        clientId: string;
        relatedClientId: string;
        relationshipType: RelationshipType;
        relationshipLabel?: string;
        notes?: string;
        createdBy?: string;
    }) {
        return prisma.clientFamilyLink.create({
            data: {
                ...data,
                tenantId
            }
        });
    }

    /**
     * Create bidirectional relationship
     */
    async createBidirectional(tenantId: string, primary: any, reciprocal: any) {
        return prisma.$transaction([
            prisma.clientFamilyLink.upsert({
                where: {
                    clientId_relatedClientId: {
                        clientId: primary.clientId,
                        relatedClientId: primary.relatedClientId
                    }
                },
                update: {
                    relationshipType: primary.relationshipType,
                    relationshipLabel: primary.relationshipLabel,
                    notes: primary.notes
                },
                create: {
                    ...primary,
                    tenantId,
                    createdBy: primary.createdBy
                }
            }),
            prisma.clientFamilyLink.upsert({
                where: {
                    clientId_relatedClientId: {
                        clientId: reciprocal.clientId,
                        relatedClientId: reciprocal.relatedClientId
                    }
                },
                update: {
                    relationshipType: reciprocal.relationshipType,
                    relationshipLabel: reciprocal.relationshipLabel,
                    notes: reciprocal.notes
                },
                create: {
                    ...reciprocal,
                    tenantId,
                    createdBy: primary.createdBy // Use same creator
                }
            })
        ]);
    }

    /**
     * Delete family link
     */
    async delete(tenantId: string, clientId: string, relatedClientId: string) {
        return prisma.clientFamilyLink.deleteMany({
            where: {
                tenantId,
                OR: [
                    { clientId, relatedClientId },
                    { clientId: relatedClientId, relatedClientId: clientId }
                ]
            }
        });
    }
}

export const familyRepository = new FamilyRepository();

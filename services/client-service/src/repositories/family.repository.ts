import { RelationshipType } from "../generated/prisma";
import { getPrismaClient } from "../config/database";

// LAZY: Prisma accessed via getPrismaClient() inside methods, NOT at module load time
// NOTE: $transaction replaced with sequential operations for PgBouncer compatibility

export class FamilyRepository {
  /**
   * Find all family links for a client
   */
  async findAllForClient(tenantId: string, clientId: string) {
    return getPrismaClient().clientFamilyLink.findMany({
      where: { tenantId, clientId },
      include: {
        relatedClient: true,
      },
    });
  }

  /**
   * Create family link
   */
  async create(
    tenantId: string,
    data: {
      clientId: string;
      relatedClientId: string;
      relationshipType: RelationshipType;
      relationshipLabel?: string;
      notes?: string;
      createdBy?: string;
    },
  ) {
    return getPrismaClient().clientFamilyLink.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  /**
   * Create bidirectional relationship
   * NOTE: Uses sequential operations instead of $transaction for PgBouncer compatibility
   */
  async createBidirectional(tenantId: string, primary: any, reciprocal: any) {
    const prisma = getPrismaClient();

    // First upsert - primary relationship
    const primaryResult = await prisma.clientFamilyLink.upsert({
      where: {
        clientId_relatedClientId: {
          clientId: primary.clientId,
          relatedClientId: primary.relatedClientId,
        },
      },
      update: {
        relationshipType: primary.relationshipType,
        relationshipLabel: primary.relationshipLabel,
        notes: primary.notes,
      },
      create: {
        ...primary,
        tenantId,
        createdBy: primary.createdBy,
      },
    });

    // Second upsert - reciprocal relationship
    const reciprocalResult = await prisma.clientFamilyLink.upsert({
      where: {
        clientId_relatedClientId: {
          clientId: reciprocal.clientId,
          relatedClientId: reciprocal.relatedClientId,
        },
      },
      update: {
        relationshipType: reciprocal.relationshipType,
        relationshipLabel: reciprocal.relationshipLabel,
        notes: reciprocal.notes,
      },
      create: {
        ...reciprocal,
        tenantId,
        createdBy: primary.createdBy,
      },
    });

    return [primaryResult, reciprocalResult];
  }

  /**
   * Delete family link
   */
  async delete(tenantId: string, clientId: string, relatedClientId: string) {
    return getPrismaClient().clientFamilyLink.deleteMany({
      where: {
        tenantId,
        OR: [
          { clientId, relatedClientId },
          { clientId: relatedClientId, relatedClientId: clientId },
        ],
      },
    });
  }
}

export const familyRepository = new FamilyRepository();

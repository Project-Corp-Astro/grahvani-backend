import { PrismaClient, Client } from '../generated/prisma';
import { getPrismaClient } from '../config/database';

export class ClientRepository {
    private prisma = getPrismaClient();

    /**
     * Find many clients with filters and pagination
     */
    async findMany(tenantId: string, options: {
        skip?: number;
        take?: number;
        searchTerm?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        createdBy?: string;
        gender?: string;
        maritalStatus?: string;
        city?: string;
        tags?: string[];
    }) {
        const {
            skip, take, searchTerm, sortBy = 'createdAt', sortOrder = 'desc',
            createdBy, gender, maritalStatus, city, tags
        } = options;

        return this.prisma.client.findMany({
            where: {
                tenantId,
                deletedAt: null,
                createdBy: createdBy || undefined,
                gender: gender as any || undefined,
                maritalStatus: maritalStatus as any || undefined,
                city: city ? { contains: city, mode: 'insensitive' } : undefined,
                tags: tags ? { array_contains: tags } : undefined,
                OR: searchTerm ? [
                    { fullName: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                    { phonePrimary: { contains: searchTerm, mode: 'insensitive' } },
                    { clientCode: { contains: searchTerm, mode: 'insensitive' } },
                    { birthPlace: { contains: searchTerm, mode: 'insensitive' } },
                ] : undefined,
            },
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
        });
    }

    /**
     * Count clients for pagination
     */
    async count(tenantId: string, options?: { searchTerm?: string; createdBy?: string; gender?: string; maritalStatus?: string; city?: string; tags?: string[] }) {
        return this.prisma.client.count({
            where: {
                tenantId,
                deletedAt: null,
                createdBy: options?.createdBy || undefined,
                gender: options?.gender as any || undefined,
                maritalStatus: options?.maritalStatus as any || undefined,
                city: options?.city ? { contains: options.city, mode: 'insensitive' } : undefined,
                tags: options?.tags ? { array_contains: options.tags } : undefined,
                OR: options?.searchTerm ? [
                    { fullName: { contains: options.searchTerm, mode: 'insensitive' } },
                    { email: { contains: options.searchTerm, mode: 'insensitive' } },
                    { phonePrimary: { contains: options.searchTerm, mode: 'insensitive' } },
                    { clientCode: { contains: options.searchTerm, mode: 'insensitive' } },
                    { birthPlace: { contains: options.searchTerm, mode: 'insensitive' } },
                ] : undefined,
            },
        });
    }

    /**
     * Find specific client by ID
     */
    async findById(tenantId: string, id: string): Promise<Client | null> {
        return this.prisma.client.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                familyLinksFrom: {
                    include: { relatedClient: true }
                },
                familyLinksTo: {
                    include: { client: true }
                },
                consultations: {
                    orderBy: { consultationDate: 'desc' },
                    take: 5
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                remedies: {
                    where: { status: 'in_progress' }
                }
            }
        });
    }

    /**
     * Check if client exists
     */
    async findUnique(tenantId: string, criteria: { email?: string; phonePrimary?: string }) {
        if (!criteria.email && !criteria.phonePrimary) return null;

        return this.prisma.client.findFirst({
            where: {
                tenantId,
                deletedAt: null, // Revert to only checking active records because deleted ones are now suffixed
                OR: [
                    criteria.email ? { email: criteria.email } : {},
                    criteria.phonePrimary ? { phonePrimary: criteria.phonePrimary } : {},
                ].filter(obj => Object.keys(obj).length > 0)
            }
        });
    }

    /**
     * Create client
     */
    async create(tenantId: string, data: any): Promise<Client> {
        return this.prisma.client.create({
            data: {
                ...data,
                tenantId,
                tags: data.tags || [],
                metadata: data.metadata || {},
            }
        });
    }

    /**
     * Update client
     */
    async update(tenantId: string, id: string, data: any): Promise<Client> {
        return this.prisma.client.update({
            where: { id, tenantId },
            data: {
                ...data,
                tags: data.tags !== undefined ? data.tags : undefined,
                metadata: data.metadata !== undefined ? data.metadata : undefined,
            },
        });
    }

    /**
     * Permanent delete client with manual cascade (fallback for DB-level cascade)
     */
    async delete(tenantId: string, id: string): Promise<void> {
        // Increase timeout for this specific heavy operation on Supabase Free Tier
        // Using raw SQL to bypass the default 60s timeout if needed
        await this.prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = 300000;`); // 5 minutes
            await tx.client.delete({
                where: {
                    id,
                    tenantId
                }
            });
        });
    }

    /**
     * Soft delete client
     */
    async softDelete(tenantId: string, id: string, extraData: any = {}): Promise<Client> {
        return this.prisma.client.update({
            where: { id, tenantId },
            data: {
                ...extraData,
                deletedAt: new Date()
            },
        });
    }
    /**
     * SYSTEM: Find clients stuck in processing (Cross-Tenant)
     * Used for startup recovery scripts only.
     */
    async findProcessingClients(limit = 50): Promise<Client[]> {
        return this.prisma.client.findMany({
            where: {
                generationStatus: 'processing', // @ts-ignore - status exists on schema but type might not be updated in generated client yet or is custom
                deletedAt: null
            },
            take: limit
        });
    }
}

export const clientRepository = new ClientRepository();

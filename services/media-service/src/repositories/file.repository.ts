import { PrismaClient, Prisma, File as PrismaFile, FileVariant } from "../generated/prisma";
import { logger } from "../config/logger";

// Use the actual generated PrismaClient, not the generic one from contracts
let prismaClient: PrismaClient | null = null;

function getPrisma(): PrismaClient {
    if (!prismaClient) {
        prismaClient = new PrismaClient();
    }
    return prismaClient;
}

export class FileRepository {
    private get prisma(): PrismaClient {
        return getPrisma();
    }

    async create(data: Prisma.FileCreateInput) {
        return this.prisma.file.create({ data, include: { variants: true } });
    }

    async findById(id: string, tenantId: string) {
        return this.prisma.file.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: { variants: true },
        });
    }

    async findByPath(bucket: string, storagePath: string) {
        return this.prisma.file.findFirst({
            where: { bucket, storagePath, deletedAt: null },
            include: { variants: true },
        });
    }

    async listByTenant(
        tenantId: string,
        options: {
            userId?: string;
            bucket?: string;
            category?: string;
            status?: string;
            page: number;
            limit: number;
        },
    ) {
        const where: Prisma.FileWhereInput = {
            tenantId,
            deletedAt: null,
            ...(options.userId && { userId: options.userId }),
            ...(options.bucket && { bucket: options.bucket }),
            ...(options.category && { category: options.category as any }),
            ...(options.status && { status: options.status as any }),
        };

        const [files, total] = await Promise.all([
            this.prisma.file.findMany({
                where,
                include: { variants: true },
                orderBy: { createdAt: "desc" },
                skip: (options.page - 1) * options.limit,
                take: options.limit,
            }),
            this.prisma.file.count({ where }),
        ]);

        return { files, total, page: options.page, limit: options.limit };
    }

    async update(id: string, tenantId: string, data: Prisma.FileUpdateInput) {
        return this.prisma.file.updateMany({
            where: { id, tenantId, deletedAt: null },
            data,
        });
    }

    async updateStatus(id: string, status: string, extra?: Partial<{ processedAt: Date; publicUrl: string }>) {
        return this.prisma.file.update({
            where: { id },
            data: { status: status as any, ...extra },
        });
    }

    async softDelete(id: string, tenantId: string) {
        return this.prisma.file.updateMany({
            where: { id, tenantId, deletedAt: null },
            data: { deletedAt: new Date(), status: "deleted" },
        });
    }

    async getStoragePaths(id: string, tenantId: string): Promise<string[]> {
        const file = await this.prisma.file.findFirst({
            where: { id, tenantId },
            include: { variants: true },
        });

        if (!file) return [];

        const paths = [file.storagePath];
        for (const variant of file.variants) {
            paths.push(variant.storagePath);
        }
        return paths;
    }
}

export class VariantRepository {
    private get prisma(): PrismaClient {
        return getPrisma();
    }

    async createMany(fileId: string, variants: Omit<Prisma.FileVariantCreateManyInput, "fileId">[]) {
        return this.prisma.fileVariant.createMany({
            data: variants.map((v) => ({ ...v, fileId })),
        });
    }

    async findByFileId(fileId: string) {
        return this.prisma.fileVariant.findMany({
            where: { fileId },
            orderBy: { name: "asc" },
        });
    }

    async deleteByFileId(fileId: string) {
        return this.prisma.fileVariant.deleteMany({
            where: { fileId },
        });
    }
}

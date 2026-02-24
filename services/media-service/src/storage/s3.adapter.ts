import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { StorageAdapter } from "./adapter.interface";
import { logger } from "../config/logger";

/**
 * S3-compatible storage adapter.
 * Works with AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO.
 * Switch from local to S3 by changing STORAGE_ADAPTER=s3 in .env
 */
export class S3StorageAdapter implements StorageAdapter {
    private client: S3Client;
    private bucket: string;
    private publicUrl: string;

    constructor(config: {
        endpoint: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        publicUrl?: string;
    }) {
        this.bucket = config.bucket;
        this.publicUrl = config.publicUrl || `${config.endpoint}/${config.bucket}`;

        this.client = new S3Client({
            endpoint: config.endpoint.includes("amazonaws.com") ? undefined : config.endpoint,
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            forcePathStyle: !config.endpoint.includes("amazonaws.com"),
        });

        logger.info({ bucket: this.bucket, endpoint: config.endpoint }, "S3 adapter initialized");
    }

    async upload(storagePath: string, buffer: Buffer, mimeType: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: storagePath,
            Body: buffer,
            ContentType: mimeType,
            CacheControl: "public, max-age=604800", // 7 days
        });

        await this.client.send(command);
        logger.info({ path: storagePath, size: buffer.length }, "File uploaded to S3");

        return this.getPublicUrl(storagePath);
    }

    async download(storagePath: string): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: storagePath,
        });

        const response = await this.client.send(command);
        const stream = response.Body as any;
        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }

        return Buffer.concat(chunks);
    }

    async delete(storagePath: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: storagePath,
        });

        await this.client.send(command);
        logger.info({ path: storagePath }, "File deleted from S3");
    }

    async deleteMany(storagePaths: string[]): Promise<void> {
        if (storagePaths.length === 0) return;

        // S3 allows batch delete of up to 1000 objects
        const batchSize = 1000;
        for (let i = 0; i < storagePaths.length; i += batchSize) {
            const batch = storagePaths.slice(i, i + batchSize);
            const command = new DeleteObjectsCommand({
                Bucket: this.bucket,
                Delete: {
                    Objects: batch.map((key) => ({ Key: key })),
                    Quiet: true,
                },
            });

            await this.client.send(command);
        }

        logger.info({ count: storagePaths.length }, "Files batch-deleted from S3");
    }

    async exists(storagePath: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: storagePath,
            });
            await this.client.send(command);
            return true;
        } catch (err: any) {
            if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw err;
        }
    }

    getPublicUrl(storagePath: string): string {
        return `${this.publicUrl}/${storagePath}`;
    }
}

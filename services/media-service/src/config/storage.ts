export interface StorageConfig {
    adapter: "local" | "s3";
    localPath: string;
    s3?: {
        endpoint: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        publicUrl?: string;
    };
    maxFileSize: number; // bytes
    allowedMimeTypes: string[];
}

export function getStorageConfig(): StorageConfig {
    return {
        adapter: (process.env.STORAGE_ADAPTER as "local" | "s3") || "local",
        localPath: process.env.STORAGE_LOCAL_PATH || "./uploads",
        s3: process.env.S3_BUCKET
            ? {
                endpoint: process.env.S3_ENDPOINT || "https://s3.amazonaws.com",
                bucket: process.env.S3_BUCKET,
                accessKeyId: process.env.S3_ACCESS_KEY || "",
                secretAccessKey: process.env.S3_SECRET_KEY || "",
                region: process.env.S3_REGION || "ap-south-1",
                publicUrl: process.env.S3_PUBLIC_URL,
            }
            : undefined,
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "52428800", 10), // 50MB default
        allowedMimeTypes: [
            // Images
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/svg+xml",
            // Documents
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            // Audio
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            // Archives
            "application/zip",
            "application/gzip",
            // CSV/Excel (for imports)
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        ],
    };
}

// Image variant configurations for auto-generation
export const IMAGE_VARIANTS = [
    { name: "thumb", width: 150, height: 150, quality: 80, fit: "cover" as const },
    { name: "small", width: 400, height: 300, quality: 80, fit: "cover" as const },
    { name: "medium", width: 800, height: 600, quality: 85, fit: "inside" as const },
    { name: "large", width: 1600, height: 1200, quality: 90, fit: "inside" as const },
];

// Bucket definitions — maps logical buckets to their access/behavior
export const BUCKETS = {
    avatars: { visibility: "public" as const, maxSize: 5 * 1024 * 1024, generateVariants: true },
    "client-photos": { visibility: "authenticated" as const, maxSize: 5 * 1024 * 1024, generateVariants: true },
    reports: { visibility: "authenticated" as const, maxSize: 50 * 1024 * 1024, generateVariants: false },
    branding: { visibility: "authenticated" as const, maxSize: 10 * 1024 * 1024, generateVariants: true },
    imports: { visibility: "private" as const, maxSize: 50 * 1024 * 1024, generateVariants: false },
    "voice-recordings": { visibility: "private" as const, maxSize: 100 * 1024 * 1024, generateVariants: false },
    general: { visibility: "authenticated" as const, maxSize: 50 * 1024 * 1024, generateVariants: false },
} as const;

export type BucketName = keyof typeof BUCKETS;

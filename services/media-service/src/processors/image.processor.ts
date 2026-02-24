import sharp from "sharp";
import { logger } from "../config/logger";

export interface ImageVariantConfig {
    name: string;
    width: number;
    height: number;
    quality: number;
    fit: "cover" | "contain" | "fill" | "inside" | "outside";
}

export interface ProcessedVariant {
    name: string;
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
    format: string;
    mimeType: string;
}

export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    hasAlpha: boolean;
    orientation?: number;
    size: number;
}

/**
 * Image processor using Sharp.
 * Handles: resize, format conversion (to WebP), variant generation, metadata extraction.
 */
export class ImageProcessor {
    /**
     * Extract metadata from an image buffer
     */
    async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: metadata.format || "unknown",
            hasAlpha: metadata.hasAlpha || false,
            orientation: metadata.orientation,
            size: buffer.length,
        };
    }

    /**
     * Convert image to WebP format (optimal for web)
     */
    async convertToWebP(buffer: Buffer, quality = 85): Promise<Buffer> {
        return sharp(buffer).webp({ quality }).toBuffer();
    }

    /**
     * Generate multiple size variants from an original image
     */
    async generateVariants(
        buffer: Buffer,
        configs: ImageVariantConfig[],
    ): Promise<ProcessedVariant[]> {
        const variants: ProcessedVariant[] = [];

        for (const config of configs) {
            try {
                const processed = await sharp(buffer)
                    .resize(config.width, config.height, {
                        fit: config.fit,
                        withoutEnlargement: true, // Don't upscale small images
                    })
                    .webp({ quality: config.quality })
                    .toBuffer({ resolveWithObject: true });

                variants.push({
                    name: config.name,
                    buffer: processed.data,
                    width: processed.info.width,
                    height: processed.info.height,
                    size: processed.info.size,
                    format: "webp",
                    mimeType: "image/webp",
                });

                logger.debug(
                    {
                        variant: config.name,
                        width: processed.info.width,
                        height: processed.info.height,
                        size: processed.info.size,
                    },
                    "Variant generated",
                );
            } catch (err) {
                logger.error({ err, variant: config.name }, "Failed to generate variant");
                // Continue with other variants even if one fails
            }
        }

        return variants;
    }

    /**
     * Process original image: auto-orient, strip metadata, convert to WebP
     */
    async processOriginal(buffer: Buffer, maxWidth = 4096, quality = 90): Promise<ProcessedVariant> {
        const processed = await sharp(buffer)
            .rotate() // Auto-orient based on EXIF
            .resize(maxWidth, maxWidth, {
                fit: "inside",
                withoutEnlargement: true,
            })
            .webp({ quality })
            .toBuffer({ resolveWithObject: true });

        return {
            name: "original",
            buffer: processed.data,
            width: processed.info.width,
            height: processed.info.height,
            size: processed.info.size,
            format: "webp",
            mimeType: "image/webp",
        };
    }

    /**
     * Check if a MIME type is a processable image
     */
    static isImage(mimeType: string): boolean {
        return [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/tiff",
        ].includes(mimeType);
    }
}

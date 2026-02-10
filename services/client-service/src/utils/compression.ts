/**
 * Chart Data Compression Utility
 * Reduces disk IO by compressing large chart JSON before storage
 *
 * @version 1.0.0
 */

import { gzipSync, gunzipSync } from "zlib";
import { logger } from "../config/logger";

// Threshold for compression (bytes) - only compress if larger than 10KB
const COMPRESSION_THRESHOLD = 10 * 1024;

// Marker to identify compressed data
const COMPRESSED_MARKER = "__GZIP__";

interface CompressedData {
  __compressed: typeof COMPRESSED_MARKER;
  data: string; // Base64 encoded gzip
  originalSize: number;
  compressedSize: number;
}

/**
 * Compress chart data if it exceeds threshold
 * Returns original data if below threshold or compression fails
 */
export function compressChartData(data: any): any {
  if (!data || typeof data !== "object") return data;

  try {
    const jsonString = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonString, "utf8");

    // Skip compression for small payloads
    if (originalSize < COMPRESSION_THRESHOLD) {
      return data;
    }

    const compressed = gzipSync(jsonString);
    const compressedSize = compressed.length;

    // Only use compression if it actually saves space (at least 20% reduction)
    const compressionRatio = compressedSize / originalSize;
    if (compressionRatio > 0.8) {
      logger.debug(
        { originalSize, compressedSize, ratio: compressionRatio },
        "Compression not beneficial, storing raw",
      );
      return data;
    }

    const result: CompressedData = {
      __compressed: COMPRESSED_MARKER,
      data: compressed.toString("base64"),
      originalSize,
      compressedSize,
    };

    logger.debug(
      {
        originalSize,
        compressedSize,
        savings: `${((1 - compressionRatio) * 100).toFixed(1)}%`,
      },
      "Chart data compressed",
    );

    return result;
  } catch (error) {
    logger.warn({ error }, "Compression failed, storing raw data");
    return data;
  }
}

/**
 * Decompress chart data if it was compressed
 * Returns data as-is if not compressed
 */
export function decompressChartData(data: any): any {
  if (!data || typeof data !== "object") return data;

  // Check if this is compressed data
  if (data.__compressed !== COMPRESSED_MARKER) {
    return data;
  }

  try {
    const compressed = Buffer.from(data.data, "base64");
    const decompressed = gunzipSync(compressed);
    const result = JSON.parse(decompressed.toString("utf8"));

    logger.debug(
      {
        compressedSize: data.compressedSize,
        originalSize: data.originalSize,
      },
      "Chart data decompressed",
    );

    return result;
  } catch (error) {
    logger.error({ error }, "Decompression failed, returning raw data");
    return data;
  }
}

/**
 * Check if data is compressed
 */
export function isCompressed(data: any): boolean {
  return (
    data && typeof data === "object" && data.__compressed === COMPRESSED_MARKER
  );
}

/**
 * Get compression stats for a piece of data
 */
export function getCompressionStats(data: any): {
  isCompressed: boolean;
  originalSize?: number;
  compressedSize?: number;
  savings?: string;
} {
  if (!isCompressed(data)) {
    return { isCompressed: false };
  }

  const ratio = 1 - data.compressedSize / data.originalSize;
  return {
    isCompressed: true,
    originalSize: data.originalSize,
    compressedSize: data.compressedSize,
    savings: `${(ratio * 100).toFixed(1)}%`,
  };
}

import multer from "multer";
import { getStorageConfig } from "../config/storage";

const storageConfig = getStorageConfig();

/**
 * Multer upload middleware.
 * Stores files in memory buffer for processing before saving to storage adapter.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageConfig.maxFileSize,
    files: 1, // Single file upload per request
  },
  fileFilter: (_req, file, cb) => {
    if (storageConfig.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

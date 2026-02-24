export class MediaError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export class FileNotFoundError extends MediaError {
  constructor(fileId: string) {
    super(404, "FILE_NOT_FOUND", `File not found: ${fileId}`);
  }
}

export class InvalidFileTypeError extends MediaError {
  constructor(mimeType: string) {
    super(400, "INVALID_FILE_TYPE", `File type not allowed: ${mimeType}`);
  }
}

export class FileTooLargeError extends MediaError {
  constructor(size: number, maxSize: number) {
    super(
      400,
      "FILE_TOO_LARGE",
      `File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
    );
  }
}

export class InvalidBucketError extends MediaError {
  constructor(bucket: string) {
    super(400, "INVALID_BUCKET", `Invalid bucket: ${bucket}`);
  }
}

export class StorageError extends MediaError {
  constructor(message: string) {
    super(502, "STORAGE_ERROR", `Storage operation failed: ${message}`);
  }
}

export class ForbiddenError extends MediaError {
  constructor(message = "Access denied") {
    super(403, "FORBIDDEN", message);
  }
}

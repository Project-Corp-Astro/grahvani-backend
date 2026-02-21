/**
 * Shared BaseError for all Grahvani services.
 * Provides structured error responses with status codes and error codes.
 */
export class BaseError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Canonical error response shape for all Grahvani services.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    timestamp: string;
    path?: string;
    details?: Array<{ field: string; message: string }> | Record<string, string>;
  };
}

// Common reusable errors
export class NotFoundError extends BaseError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends BaseError {
  details: Array<{ field: string; message: string }>;

  constructor(
    details: Array<{ field: string; message: string }>,
    message: string = "Validation failed",
  ) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

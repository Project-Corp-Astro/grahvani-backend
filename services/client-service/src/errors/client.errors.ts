// Client Service Specific Errors
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

export class ClientNotFoundError extends BaseError {
  constructor(id: string) {
    super(`Client with ID ${id} not found`, 404, "CLIENT_NOT_FOUND");
  }
}

export class DuplicateClientError extends BaseError {
  constructor(field: string, value: string) {
    super(
      `Client with ${field} '${value}' already exists`,
      409,
      "DUPLICATE_CLIENT",
    );
  }
}

export class InvalidBirthDetailsError extends BaseError {
  constructor(message: string = "Invalid birth details provided") {
    super(message, 400, "INVALID_BIRTH_DETAILS");
  }
}

export class UnauthorizedAccessError extends BaseError {
  constructor() {
    super(
      "Unauthorized access to this client record",
      403,
      "UNAUTHORIZED_ACCESS",
    );
  }
}

export class ValidationError extends BaseError {
  constructor(details: any) {
    super("Validation failed", 400, "VALIDATION_ERROR");
    this.message = JSON.stringify(details);
  }
}

export class FeatureNotSupportedError extends BaseError {
  constructor(feature: string, system: string) {
    super(
      `Feature or Chart type '${feature}' is not available for the '${system}' system`,
      400,
      "FEATURE_NOT_SUPPORTED",
    );
  }
}

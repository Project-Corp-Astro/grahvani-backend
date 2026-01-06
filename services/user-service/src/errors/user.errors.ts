// User Service Errors
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

export class UserNotFoundError extends BaseError {
    constructor() {
        super('User not found', 404, 'USER_NOT_FOUND');
    }
}

export class DisplayNameTakenError extends BaseError {
    constructor() {
        super('This display name is already in use', 400, 'DISPLAY_NAME_TAKEN');
    }
}

export class ForbiddenError extends BaseError {
    constructor(message: string = 'You do not have permission to perform this action') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class ValidationError extends BaseError {
    errors: Record<string, string[]>;

    constructor(errors: Record<string, string[]>) {
        super('Validation failed', 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class UnauthorizedError extends BaseError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

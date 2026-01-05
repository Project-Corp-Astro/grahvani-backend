// Auth-specific Errors
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

export class UserExistsError extends BaseError {
    constructor() {
        super('User with this email already exists', 409, 'USER_EXISTS');
    }
}

export class InvalidCredentialsError extends BaseError {
    constructor() {
        super('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
}

export class AccountSuspendedError extends BaseError {
    constructor() {
        super('Your account has been suspended', 403, 'ACCOUNT_SUSPENDED');
    }
}

export class EmailNotVerifiedError extends BaseError {
    constructor() {
        super('Please verify your email address', 403, 'EMAIL_NOT_VERIFIED');
    }
}

export class NotFoundError extends BaseError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class TokenExpiredError extends BaseError {
    constructor() {
        super('Token has expired', 401, 'TOKEN_EXPIRED');
    }
}

export class InvalidTokenError extends BaseError {
    constructor() {
        super('Invalid token', 401, 'INVALID_TOKEN');
    }
}

export class RateLimitError extends BaseError {
    constructor() {
        super('Too many requests. Please try again later.', 429, 'RATE_LIMITED');
    }
}

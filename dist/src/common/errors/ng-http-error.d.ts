import { HttpException } from '@nestjs/common';
export type NgErrorBody = {
    statusCode: number;
    error: string;
    code: string;
    message: string;
    timestamp: string;
    details?: unknown;
    retryable?: boolean;
    retryAfterSec?: number;
};
export declare class NgHttpError extends HttpException {
    readonly body: NgErrorBody;
    constructor(body: NgErrorBody);
}
export declare const NgErrorCodes: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT";
    readonly EVENT_CONFLICT: "EVENT_CONFLICT";
    readonly INTERNAL: "INTERNAL";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
export declare function makeValidationError(details: unknown): NgHttpError;
export declare function makeNotFoundError(message?: string, details?: unknown): NgHttpError;

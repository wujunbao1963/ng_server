"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgErrorCodes = exports.NgHttpError = void 0;
exports.makeValidationError = makeValidationError;
exports.makeNotFoundError = makeNotFoundError;
const common_1 = require("@nestjs/common");
class NgHttpError extends common_1.HttpException {
    constructor(body) {
        super(body, body.statusCode);
        this.body = body;
    }
}
exports.NgHttpError = NgHttpError;
exports.NgErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
    EVENT_CONFLICT: 'EVENT_CONFLICT',
    INTERNAL: 'INTERNAL',
};
function makeValidationError(details) {
    return new NgHttpError({
        statusCode: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Unprocessable Entity',
        code: exports.NgErrorCodes.VALIDATION_ERROR,
        message: 'Request validation failed',
        timestamp: new Date().toISOString(),
        details: { validationErrors: details },
        retryable: false,
    });
}
function makeNotFoundError(message = 'Not Found', details) {
    return new NgHttpError({
        statusCode: 404,
        error: 'Not Found',
        code: 'NOT_FOUND',
        message,
        timestamp: new Date().toISOString(),
        details,
        retryable: false,
    });
}
//# sourceMappingURL=ng-http-error.js.map
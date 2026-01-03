"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const ng_http_error_1 = require("./ng-http-error");
let NgExceptionFilter = class NgExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        if (exception instanceof ng_http_error_1.NgHttpError) {
            const body = normalizeBody(exception.body);
            res.status(body.statusCode).json(body);
            return;
        }
        if (exception instanceof common_1.HttpException) {
            const statusCode = exception.getStatus();
            const payload = exception.getResponse();
            const message = typeof payload === 'string'
                ? payload
                : Array.isArray(payload?.message)
                    ? payload.message.join('; ')
                    : payload?.message ?? exception.message;
            const code = mapHttpStatusToCode(statusCode);
            const errorText = typeof payload === 'object' && typeof payload?.error === 'string'
                ? payload.error
                : httpStatusName(statusCode);
            const details = typeof payload === 'object' && payload?.message
                ? { messages: payload.message }
                : typeof payload === 'object' && payload !== null
                    ? payload
                    : { value: payload };
            const body = {
                statusCode,
                error: errorText,
                code,
                message,
                timestamp: new Date().toISOString(),
                details,
                retryable: isRetryable(statusCode),
            };
            res.status(statusCode).json(body);
            return;
        }
        const body = {
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            error: httpStatusName(common_1.HttpStatus.INTERNAL_SERVER_ERROR),
            code: ng_http_error_1.NgErrorCodes.INTERNAL,
            message: 'Internal server error',
            timestamp: new Date().toISOString(),
            retryable: true,
        };
        res.status(body.statusCode).json(body);
    }
};
exports.NgExceptionFilter = NgExceptionFilter;
exports.NgExceptionFilter = NgExceptionFilter = __decorate([
    (0, common_1.Catch)()
], NgExceptionFilter);
function normalizeBody(body) {
    return {
        ...body,
        error: body.error || httpStatusName(body.statusCode),
        timestamp: body.timestamp || new Date().toISOString(),
        details: body.details && typeof body.details === 'object' && !Array.isArray(body.details)
            ? body.details
            : body.details === undefined
                ? undefined
                : { value: body.details },
    };
}
function httpStatusName(status) {
    return common_1.HttpStatus[status] ?? 'Error';
}
function mapHttpStatusToCode(status) {
    switch (status) {
        case common_1.HttpStatus.UNAUTHORIZED:
            return ng_http_error_1.NgErrorCodes.UNAUTHORIZED;
        case common_1.HttpStatus.FORBIDDEN:
            return ng_http_error_1.NgErrorCodes.FORBIDDEN;
        case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
            return ng_http_error_1.NgErrorCodes.VALIDATION_ERROR;
        default:
            return `HTTP_${status}`;
    }
}
function isRetryable(status) {
    return status >= 500;
}
//# sourceMappingURL=ng-exception.filter.js.map
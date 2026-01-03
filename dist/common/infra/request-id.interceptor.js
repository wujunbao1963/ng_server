"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRequestIdInterceptor = exports.RequestIdInterceptor = exports.requestContextStorage = void 0;
exports.getCurrentRequestContext = getCurrentRequestContext;
exports.getCurrentRequestId = getCurrentRequestId;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const crypto = require("crypto");
const logger_service_1 = require("./logger.service");
const async_hooks_1 = require("async_hooks");
exports.requestContextStorage = new async_hooks_1.AsyncLocalStorage();
function getCurrentRequestContext() {
    return exports.requestContextStorage.getStore();
}
function getCurrentRequestId() {
    return exports.requestContextStorage.getStore()?.requestId;
}
let RequestIdInterceptor = class RequestIdInterceptor {
    constructor(logger) {
        this.logger = logger.setContext('RequestIdInterceptor');
    }
    intercept(context, next) {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const requestId = request.headers['x-request-id'] ||
            request.headers['x-correlation-id'] ||
            crypto.randomUUID();
        const startTime = Date.now();
        const requestContext = {
            requestId,
            startTime,
            userId: request.user?.userId,
            deviceId: request.device?.id,
            circleId: request.params?.circleId,
        };
        response.setHeader('X-Request-Id', requestId);
        const method = request.method;
        const url = request.url;
        const userAgent = request.headers['user-agent'] || 'unknown';
        return new rxjs_1.Observable((subscriber) => {
            exports.requestContextStorage.run(requestContext, () => {
                this.logger.log(`→ ${method} ${url}`, {
                    requestId,
                    userAgent: userAgent.substring(0, 50),
                });
                next.handle().pipe((0, operators_1.tap)({
                    next: () => {
                        const duration = Date.now() - startTime;
                        const statusCode = response.statusCode;
                        this.logger.log(`← ${method} ${url} ${statusCode} ${duration}ms`, {
                            requestId,
                            circleId: requestContext.circleId,
                        });
                    },
                    error: (error) => {
                        const duration = Date.now() - startTime;
                        const statusCode = error.status || error.statusCode || 500;
                        this.logger.error(`✗ ${method} ${url} ${statusCode} ${duration}ms`, error.message, {
                            requestId,
                            circleId: requestContext.circleId,
                        });
                    },
                })).subscribe(subscriber);
            });
        });
    }
};
exports.RequestIdInterceptor = RequestIdInterceptor;
exports.RequestIdInterceptor = RequestIdInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.NgLoggerService])
], RequestIdInterceptor);
let SimpleRequestIdInterceptor = class SimpleRequestIdInterceptor {
    intercept(context, next) {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();
        const requestId = request.headers['x-request-id'] ||
            request.headers['x-correlation-id'] ||
            crypto.randomUUID();
        request.requestId = requestId;
        response.setHeader('X-Request-Id', requestId);
        return next.handle();
    }
};
exports.SimpleRequestIdInterceptor = SimpleRequestIdInterceptor;
exports.SimpleRequestIdInterceptor = SimpleRequestIdInterceptor = __decorate([
    (0, common_1.Injectable)()
], SimpleRequestIdInterceptor);
//# sourceMappingURL=request-id.interceptor.js.map
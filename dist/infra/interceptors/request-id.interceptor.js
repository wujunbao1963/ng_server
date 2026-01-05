"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestIdInterceptor = void 0;
exports.getRequestId = getRequestId;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const crypto = require("crypto");
let RequestIdInterceptor = class RequestIdInterceptor {
    constructor() {
        this.logger = new common_1.Logger('HTTP');
    }
    intercept(context, next) {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const requestId = this.getOrGenerateRequestId(request);
        request.requestId = requestId;
        response.setHeader('X-Request-ID', requestId);
        const { method, url } = request;
        const startTime = Date.now();
        this.logger.log(`→ ${method} ${url} [${requestId}]`);
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const duration = Date.now() - startTime;
                const statusCode = response.statusCode;
                this.logger.log(`← ${method} ${url} ${statusCode} ${duration}ms [${requestId}]`);
            },
            error: (error) => {
                const duration = Date.now() - startTime;
                const statusCode = error.status || error.statusCode || 500;
                this.logger.warn(`← ${method} ${url} ${statusCode} ${duration}ms [${requestId}] ${error.message}`);
            },
        }));
    }
    getOrGenerateRequestId(request) {
        const clientRequestId = request.headers['x-request-id'];
        if (clientRequestId && typeof clientRequestId === 'string' && this.isValidRequestId(clientRequestId)) {
            return clientRequestId;
        }
        return this.generateRequestId();
    }
    isValidRequestId(id) {
        return /^[a-zA-Z0-9-]{8,64}$/.test(id);
    }
    generateRequestId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex');
        return `req-${timestamp}-${random}`;
    }
};
exports.RequestIdInterceptor = RequestIdInterceptor;
exports.RequestIdInterceptor = RequestIdInterceptor = __decorate([
    (0, common_1.Injectable)()
], RequestIdInterceptor);
function getRequestId(request) {
    return request.requestId;
}
//# sourceMappingURL=request-id.interceptor.js.map
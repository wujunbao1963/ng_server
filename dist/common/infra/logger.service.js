"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgLoggerService = void 0;
exports.createLogger = createLogger;
const common_1 = require("@nestjs/common");
let NgLoggerService = class NgLoggerService {
    constructor() {
        this.context = 'Application';
        this.requestContext = {};
    }
    setContext(context) {
        this.context = context;
        return this;
    }
    setRequestContext(ctx) {
        this.requestContext = ctx;
        return this;
    }
    clearRequestContext() {
        this.requestContext = {};
    }
    log(message, context) {
        this.writeLog('INFO', message, context);
    }
    error(message, trace, context) {
        this.writeLog('ERROR', message, { ...context, trace });
    }
    warn(message, context) {
        this.writeLog('WARN', message, context);
    }
    debug(message, context) {
        if (process.env.NODE_ENV === 'production')
            return;
        this.writeLog('DEBUG', message, context);
    }
    verbose(message, context) {
        if (process.env.NODE_ENV === 'production')
            return;
        this.writeLog('VERBOSE', message, context);
    }
    writeLog(level, message, additionalContext) {
        const timestamp = new Date().toISOString();
        const merged = { ...this.requestContext, ...additionalContext };
        const contextStr = this.context ? `[${this.context}]` : '';
        const requestIdStr = merged.requestId ? `[${merged.requestId.slice(0, 8)}]` : '';
        const extras = [];
        if (merged.circleId)
            extras.push(`circle=${merged.circleId.slice(0, 8)}`);
        if (merged.eventId)
            extras.push(`event=${merged.eventId.slice(0, 8)}`);
        if (merged.deviceId)
            extras.push(`device=${merged.deviceId.slice(0, 8)}`);
        if (merged.userId)
            extras.push(`user=${merged.userId.slice(0, 8)}`);
        const extrasStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';
        const logLine = `${timestamp} ${level.padEnd(7)} ${contextStr}${requestIdStr} ${message}${extrasStr}`;
        switch (level) {
            case 'ERROR':
                console.error(logLine);
                if (merged.trace)
                    console.error(merged.trace);
                break;
            case 'WARN':
                console.warn(logLine);
                break;
            case 'DEBUG':
            case 'VERBOSE':
                console.debug(logLine);
                break;
            default:
                console.log(logLine);
        }
    }
};
exports.NgLoggerService = NgLoggerService;
exports.NgLoggerService = NgLoggerService = __decorate([
    (0, common_1.Injectable)()
], NgLoggerService);
function createLogger(context) {
    const logger = new NgLoggerService();
    logger.setContext(context);
    return logger;
}
//# sourceMappingURL=logger.service.js.map
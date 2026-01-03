import { LoggerService } from '@nestjs/common';
export interface LogContext {
    requestId?: string;
    circleId?: string;
    eventId?: string;
    deviceId?: string;
    userId?: string;
    [key: string]: unknown;
}
export declare class NgLoggerService implements LoggerService {
    private context;
    private requestContext;
    setContext(context: string): this;
    setRequestContext(ctx: LogContext): this;
    clearRequestContext(): void;
    log(message: string, context?: LogContext): void;
    error(message: string, trace?: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    verbose(message: string, context?: LogContext): void;
    private writeLog;
}
export declare function createLogger(context: string): NgLoggerService;

import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { NgLoggerService } from './logger.service';
export interface RequestContext {
    requestId: string;
    startTime: number;
    userId?: string;
    deviceId?: string;
    circleId?: string;
}
import { AsyncLocalStorage } from 'async_hooks';
export declare const requestContextStorage: AsyncLocalStorage<RequestContext>;
export declare function getCurrentRequestContext(): RequestContext | undefined;
export declare function getCurrentRequestId(): string | undefined;
export declare class RequestIdInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: NgLoggerService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
export declare class SimpleRequestIdInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}

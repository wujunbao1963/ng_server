import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
export declare class RequestIdInterceptor implements NestInterceptor {
    private readonly logger;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private getOrGenerateRequestId;
    private isValidRequestId;
    private generateRequestId;
}
export declare function getRequestId(request: Request): string | undefined;

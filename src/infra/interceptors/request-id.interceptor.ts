import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

/**
 * RequestIdInterceptor - 请求追踪拦截器
 * 
 * 功能：
 * 1. 为每个请求生成唯一 ID（或使用客户端提供的 X-Request-ID）
 * 2. 将 requestId 注入 request 对象
 * 3. 在响应头中返回 X-Request-ID
 * 4. 记录请求开始和结束日志（含耗时）
 * 
 * 使用方式：
 * 1. 全局注册：app.useGlobalInterceptors(new RequestIdInterceptor())
 * 2. 模块注册：providers: [{ provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor }]
 * 3. Controller 级别：@UseInterceptors(RequestIdInterceptor)
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 获取或生成 requestId
    const requestId = this.getOrGenerateRequestId(request);

    // 注入到 request 对象
    (request as any).requestId = requestId;

    // 设置响应头
    response.setHeader('X-Request-ID', requestId);

    // 记录请求开始
    const { method, url } = request;
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url} [${requestId}]`);

    return next.handle().pipe(
      tap({
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
      }),
    );
  }

  private getOrGenerateRequestId(request: Request): string {
    // 优先使用客户端提供的 X-Request-ID
    const clientRequestId = request.headers['x-request-id'];
    if (clientRequestId && typeof clientRequestId === 'string' && this.isValidRequestId(clientRequestId)) {
      return clientRequestId;
    }

    // 生成新的 requestId
    return this.generateRequestId();
  }

  private isValidRequestId(id: string): boolean {
    // 验证格式：允许 UUID 或短 ID（8-64 字符，字母数字和连字符）
    return /^[a-zA-Z0-9-]{8,64}$/.test(id);
  }

  private generateRequestId(): string {
    // 格式: req-{timestamp}-{random}
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `req-${timestamp}-${random}`;
  }
}

/**
 * 从 Request 对象获取 requestId 的辅助函数
 */
export function getRequestId(request: Request): string | undefined {
  return (request as any).requestId;
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { NgLoggerService } from './logger.service';

/**
 * 请求上下文 - 存储请求级别的追踪信息
 */
export interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
  deviceId?: string;
  circleId?: string;
}

/**
 * AsyncLocalStorage 用于在异步调用链中传递请求上下文
 * Node.js 16+ 原生支持
 */
import { AsyncLocalStorage } from 'async_hooks';

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 获取当前请求上下文
 */
export function getCurrentRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * 获取当前请求ID
 */
export function getCurrentRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

/**
 * RequestIdInterceptor - 请求链路追踪拦截器
 *
 * 功能：
 * 1. 为每个请求生成或复用 requestId
 * 2. 将 requestId 注入响应头
 * 3. 记录请求开始和结束日志
 * 4. 使用 AsyncLocalStorage 在整个请求链中传递上下文
 *
 * 使用方式：
 * - 全局注册：app.useGlobalInterceptors(new RequestIdInterceptor())
 * - 模块注册：{ provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor }
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger: NgLoggerService;

  constructor(logger: NgLoggerService) {
    this.logger = logger.setContext('RequestIdInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    // 从请求头获取或生成 requestId
    const requestId =
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      crypto.randomUUID();

    // 记录开始时间
    const startTime = Date.now();

    // 构建请求上下文
    const requestContext: RequestContext = {
      requestId,
      startTime,
      // 从已解析的用户/设备信息中提取（如果有）
      userId: request.user?.userId,
      deviceId: request.device?.id,
      circleId: request.params?.circleId,
    };

    // 设置响应头
    response.setHeader('X-Request-Id', requestId);

    // 提取请求信息用于日志
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'] || 'unknown';

    // 使用 AsyncLocalStorage 运行后续处理
    return new Observable((subscriber) => {
      requestContextStorage.run(requestContext, () => {
        this.logger.log(`→ ${method} ${url}`, {
          requestId,
          userAgent: userAgent.substring(0, 50),
        });

        next.handle().pipe(
          tap({
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
              this.logger.error(
                `✗ ${method} ${url} ${statusCode} ${duration}ms`,
                error.message,
                {
                  requestId,
                  circleId: requestContext.circleId,
                },
              );
            },
          }),
        ).subscribe(subscriber);
      });
    });
  }
}

/**
 * 简化版拦截器 - 不使用 AsyncLocalStorage，适用于简单场景
 */
@Injectable()
export class SimpleRequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    // 生成或复用 requestId
    const requestId =
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      crypto.randomUUID();

    // 注入到 request 对象，供后续使用
    request.requestId = requestId;

    // 设置响应头
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}

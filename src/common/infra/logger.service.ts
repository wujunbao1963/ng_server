import { Injectable, LoggerService, Scope } from '@nestjs/common';

/**
 * 日志上下文 - 附加到每条日志的元数据
 */
export interface LogContext {
  requestId?: string;
  circleId?: string;
  eventId?: string;
  deviceId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * NgLoggerService - 统一日志服务
 *
 * 替代代码中散落的 console.log，提供：
 * 1. 结构化日志输出
 * 2. 上下文附加（requestId, circleId 等）
 * 3. 日志级别控制
 * 4. 易于替换底层实现（如 pino, winston）
 *
 * 使用方式：
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly logger: NgLoggerService) {
 *     this.logger.setContext('MyService');
 *   }
 *
 *   doSomething() {
 *     this.logger.log('Operation started', { eventId: '123' });
 *   }
 * }
 * ```
 */
@Injectable()
export class NgLoggerService implements LoggerService {
  private context: string = 'Application';
  private requestContext: LogContext = {};

  /**
   * 设置日志来源上下文（通常是类名）
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * 设置请求级别上下文（requestId, userId 等）
   * 通常由 Interceptor 在请求开始时调用
   */
  setRequestContext(ctx: LogContext): this {
    this.requestContext = ctx;
    return this;
  }

  /**
   * 清除请求上下文
   * 通常由 Interceptor 在请求结束时调用
   */
  clearRequestContext(): void {
    this.requestContext = {};
  }

  /**
   * 记录信息日志
   */
  log(message: string, context?: LogContext): void {
    this.writeLog('INFO', message, context);
  }

  /**
   * 记录错误日志
   */
  error(message: string, trace?: string, context?: LogContext): void {
    this.writeLog('ERROR', message, { ...context, trace });
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.writeLog('WARN', message, context);
  }

  /**
   * 记录调试日志
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'production') return;
    this.writeLog('DEBUG', message, context);
  }

  /**
   * 记录详细日志
   */
  verbose(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'production') return;
    this.writeLog('VERBOSE', message, context);
  }

  private writeLog(level: string, message: string, additionalContext?: LogContext): void {
    const timestamp = new Date().toISOString();
    const merged = { ...this.requestContext, ...additionalContext };

    // 构建日志前缀
    const contextStr = this.context ? `[${this.context}]` : '';
    const requestIdStr = merged.requestId ? `[${merged.requestId.slice(0, 8)}]` : '';

    // 构建额外字段
    const extras: string[] = [];
    if (merged.circleId) extras.push(`circle=${merged.circleId.slice(0, 8)}`);
    if (merged.eventId) extras.push(`event=${merged.eventId.slice(0, 8)}`);
    if (merged.deviceId) extras.push(`device=${merged.deviceId.slice(0, 8)}`);
    if (merged.userId) extras.push(`user=${merged.userId.slice(0, 8)}`);

    const extrasStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';

    // 输出格式：[时间] [级别] [上下文] [requestId] 消息 (额外字段)
    const logLine = `${timestamp} ${level.padEnd(7)} ${contextStr}${requestIdStr} ${message}${extrasStr}`;

    switch (level) {
      case 'ERROR':
        console.error(logLine);
        if (merged.trace) console.error(merged.trace);
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
}

/**
 * 创建带上下文的 Logger 实例
 *
 * 用于在模块初始化时创建带固定 context 的 logger
 */
export function createLogger(context: string): NgLoggerService {
  const logger = new NgLoggerService();
  logger.setContext(context);
  return logger;
}

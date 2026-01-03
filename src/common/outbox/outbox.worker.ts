import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { OutboxService, ProcessResult } from './outbox.service';
import { NgLoggerService } from '../infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../infra/clock.port';

/**
 * 消息处理器接口
 */
export interface OutboxHandler {
  /**
   * 处理消息
   */
  handle(message: NgOutbox): Promise<ProcessResult>;

  /**
   * 支持的消息类型
   */
  readonly messageType: OutboxMessageType;
}

/**
 * Handler 注册 token
 */
export const OUTBOX_HANDLERS = Symbol('OUTBOX_HANDLERS');

/**
 * OutboxWorker - Outbox 消息消费者
 *
 * 职责：
 * 1. 定期轮询待处理消息
 * 2. 分发给注册的 Handler
 * 3. 管理消息状态
 * 4. 处理重试逻辑
 *
 * 配置：
 * - OUTBOX_WORKER_ENABLED: 是否启用 (默认 true)
 * - OUTBOX_POLL_INTERVAL_MS: 轮询间隔 (默认 5000ms)
 * - OUTBOX_BATCH_SIZE: 每次获取消息数量 (默认 10)
 * - OUTBOX_STALE_TIMEOUT_MINUTES: 超时重置时间 (默认 10分钟)
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger: NgLoggerService;
  private readonly handlers: Map<OutboxMessageType, OutboxHandler> = new Map();
  private pollTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isShuttingDown = false;

  // 配置
  private readonly enabled: boolean;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly staleTimeoutMinutes: number;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly config: ConfigService,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(OUTBOX_HANDLERS) handlers: OutboxHandler[],
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('OutboxWorker');

    // 注册 handlers
    for (const handler of handlers) {
      this.handlers.set(handler.messageType, handler);
      this.logger.log('Registered handler', { messageType: handler.messageType });
    }

    // 读取配置
    this.enabled = this.config.get<string>('OUTBOX_WORKER_ENABLED', 'true') === 'true';
    this.pollIntervalMs = parseInt(this.config.get<string>('OUTBOX_POLL_INTERVAL_MS', '5000'), 10);
    this.batchSize = parseInt(this.config.get<string>('OUTBOX_BATCH_SIZE', '10'), 10);
    this.staleTimeoutMinutes = parseInt(this.config.get<string>('OUTBOX_STALE_TIMEOUT_MINUTES', '10'), 10);
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Outbox worker is disabled');
      return;
    }

    this.logger.log('Starting outbox worker', {
      pollIntervalMs: this.pollIntervalMs,
      batchSize: this.batchSize,
      handlersCount: this.handlers.size,
    });

    // 启动轮询
    this.startPolling();

    // 启动重试轮询 (每分钟)
    this.retryTimer = setInterval(() => this.pollRetryable(), 60 * 1000);

    // 启动清理任务 (每小时)
    this.cleanupTimer = setInterval(() => this.runCleanup(), 60 * 60 * 1000);

    // 启动时重置超时消息
    await this.outboxService.resetStaleProcessingMessages(this.staleTimeoutMinutes);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Stopping outbox worker');
    this.isShuttingDown = true;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 等待当前处理完成
    let waitCount = 0;
    while (this.isRunning && waitCount < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitCount++;
    }

    this.logger.log('Outbox worker stopped');
  }

  /**
   * 启动轮询
   */
  private startPolling(): void {
    if (this.isShuttingDown) return;

    this.pollTimer = setTimeout(async () => {
      await this.poll();
      this.startPolling();
    }, this.pollIntervalMs);
  }

  /**
   * 轮询并处理消息
   */
  private async poll(): Promise<void> {
    if (this.isRunning || this.isShuttingDown) return;

    this.isRunning = true;

    try {
      const messages = await this.outboxService.fetchPendingMessages(
        this.batchSize,
        Array.from(this.handlers.keys()),
      );

      if (messages.length > 0) {
        this.logger.debug('Fetched messages', { count: messages.length });
      }

      // 并行处理消息
      await Promise.all(messages.map((msg) => this.processMessage(msg)));
    } catch (error) {
      this.logger.error('Poll failed', String(error));
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 轮询重试队列
   */
  private async pollRetryable(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const messages = await this.outboxService.fetchRetryableMessages(this.batchSize);

      if (messages.length > 0) {
        this.logger.log('Fetched retryable messages', { count: messages.length });
        await Promise.all(messages.map((msg) => this.processMessage(msg)));
      }
    } catch (error) {
      this.logger.error('Retry poll failed', String(error));
    }
  }

  /**
   * 运行清理任务
   */
  private async runCleanup(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      // 重置超时消息
      await this.outboxService.resetStaleProcessingMessages(this.staleTimeoutMinutes);

      // 清理旧消息
      await this.outboxService.cleanupCompletedMessages(7);
    } catch (error) {
      this.logger.error('Cleanup failed', String(error));
    }
  }

  /**
   * 处理单条消息
   */
  private async processMessage(message: NgOutbox): Promise<void> {
    const handler = this.handlers.get(message.messageType);

    if (!handler) {
      this.logger.error('No handler found for message type', undefined, {
        messageId: message.id,
        messageType: message.messageType,
      });
      await this.outboxService.markFailed(message, 'No handler registered', false);
      return;
    }

    try {
      // 标记开始处理
      await this.outboxService.markProcessing(message);

      // 调用 handler
      const result = await handler.handle(message);

      if (result.success) {
        await this.outboxService.markCompleted(message);
      } else {
        await this.outboxService.markFailed(
          message,
          result.error ?? 'Unknown error',
          result.retryable ?? true,
        );
      }
    } catch (error: any) {
      this.logger.error('Message processing error', error.message, {
        messageId: message.id,
        messageType: message.messageType,
      });
      await this.outboxService.markFailed(message, error.message, true);
    }
  }

  /**
   * 手动触发一次轮询 (测试用)
   */
  async triggerPoll(): Promise<void> {
    await this.poll();
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    enabled: boolean;
    isRunning: boolean;
    handlersCount: number;
    messageStats: Record<string, number>;
  }> {
    const messageStats = await this.outboxService.getStats();
    return {
      enabled: this.enabled,
      isRunning: this.isRunning,
      handlersCount: this.handlers.size,
      messageStats,
    };
  }
}

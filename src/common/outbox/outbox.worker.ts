import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { OutboxHandler, NonRetryableError, OUTBOX_HANDLERS } from './push-notification.handler';

export interface WorkerStats {
  enabled: boolean;
  isRunning: boolean;
  handlersCount: number;
  messageStats: {
    processed: number;
    succeeded: number;
    failed: number;
    deadLettered: number;
  };
}

/**
 * Outbox Worker
 * 
 * 职责：
 * 1. 定期轮询 PENDING 消息
 * 2. 分发给对应的 Handler 处理
 * 3. 更新消息状态
 * 4. 执行维护任务（重置超时、清理旧消息）
 * 
 * 并发安全：
 * - 使用 FOR UPDATE SKIP LOCKED 避免多实例冲突
 * - 单实例内串行处理避免竞态
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly handlers: Map<OutboxMessageType, OutboxHandler> = new Map();
  
  private pollTimer: NodeJS.Timeout | null = null;
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // 统计
  private processed = 0;
  private succeeded = 0;
  private failed = 0;
  private deadLettered = 0;

  // 配置
  private readonly enabled: boolean;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly staleTimeoutMinutes: number;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly config: ConfigService,
    @Inject(OUTBOX_HANDLERS) handlers: OutboxHandler[],
  ) {
    // 从配置读取参数
    this.enabled = this.config.get<string>('OUTBOX_WORKER_ENABLED', 'true') === 'true';
    this.pollIntervalMs = parseInt(this.config.get<string>('OUTBOX_POLL_INTERVAL_MS', '5000'), 10);
    this.batchSize = parseInt(this.config.get<string>('OUTBOX_BATCH_SIZE', '10'), 10);
    this.staleTimeoutMinutes = parseInt(this.config.get<string>('OUTBOX_STALE_TIMEOUT_MINUTES', '10'), 10);

    // 注册 handlers
    for (const handler of handlers) {
      this.handlers.set(handler.messageType, handler);
      this.logger.log(`Registered handler: ${handler.messageType}`);
    }
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Outbox worker is DISABLED');
      return;
    }

    this.logger.log(
      `Starting outbox worker: pollInterval=${this.pollIntervalMs}ms ` +
      `batchSize=${this.batchSize} handlers=${this.handlers.size}`
    );

    // 启动轮询
    this.schedulePoll();

    // 启动维护任务（每 5 分钟）
    this.maintenanceTimer = setInterval(() => this.runMaintenance(), 5 * 60 * 1000);
    
    // 立即执行一次维护（重置可能的超时消息）
    await this.runMaintenance();
  }

  onModuleDestroy() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
    this.logger.log('Outbox worker stopped');
  }

  /**
   * 安排下一次轮询
   */
  private schedulePoll() {
    this.pollTimer = setTimeout(async () => {
      await this.poll();
      this.schedulePoll();
    }, this.pollIntervalMs);
  }

  /**
   * 轮询并处理消息
   */
  private async poll() {
  this.logger.log('[POLL] poll() called');
  if (this.isRunning) {
    this.logger.log('[POLL] skipped - already running');
    return;
  }

    this.isRunning = true;

    try {
      // 先重置可重试的 FAILED 消息
      await this.outboxService.resetFailedMessages();

      // 获取待处理消息
      const messages = await this.outboxService.fetchPendingMessages(this.batchSize);

      if (messages.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${messages.length} messages`);

      // 串行处理（可以改为并行，但需要注意资源控制）
      for (const message of messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Poll error: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 处理单个消息
   */
  private async processMessage(message: NgOutbox): Promise<void> {
    this.processed++;

    const handler = this.handlers.get(message.messageType);
    if (!handler) {
      this.logger.error(`No handler for message type: ${message.messageType}`);
      await this.outboxService.markFailed(
        message,
        `No handler for type: ${message.messageType}`,
        true // 不可重试
      );
      this.deadLettered++;
      return;
    }

    try {
      await handler.handle(message);
      await this.outboxService.markCompleted(message);
      this.succeeded++;
    } catch (error) {
      const err = error as Error;
      const isNonRetryable = error instanceof NonRetryableError;
      await this.outboxService.markFailed(message, err.message, isNonRetryable);
      
      if (isNonRetryable || !message.canRetry()) {
        this.deadLettered++;
      }
      this.failed++;
    }
  }

  /**
   * 维护任务
   */
  private async runMaintenance() {
    try {
      // 1. 重置超时的 PROCESSING 消息
      await this.outboxService.resetStaleProcessingMessages(this.staleTimeoutMinutes);

      // 2. 清理 7 天前的已完成消息
      await this.outboxService.cleanupCompletedMessages(7);

      // 3. 记录统计
      const stats = await this.outboxService.getStats();
      this.logger.log(
        `Outbox stats: PENDING=${stats.PENDING} PROCESSING=${stats.PROCESSING} ` +
        `COMPLETED=${stats.COMPLETED} FAILED=${stats.FAILED} DEAD=${stats.DEAD}`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Maintenance error: ${err.message}`, err.stack);
    }
  }

  /**
   * 获取 Worker 统计信息
   */
  getStats(): WorkerStats {
    return {
      enabled: this.enabled,
      isRunning: this.isRunning,
      handlersCount: this.handlers.size,
      messageStats: {
        processed: this.processed,
        succeeded: this.succeeded,
        failed: this.failed,
        deadLettered: this.deadLettered,
      },
    };
  }

  /**
   * 手动触发一次轮询（用于测试）
   */
  async triggerPoll(): Promise<void> {
    await this.poll();
  }
}

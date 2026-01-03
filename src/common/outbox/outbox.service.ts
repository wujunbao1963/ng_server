import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThanOrEqual, In } from 'typeorm';
import { NgOutbox, OutboxMessageType, OutboxStatus } from './ng-outbox.entity';
import { NgLoggerService } from '../infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../infra/clock.port';

/**
 * 入队选项
 */
export interface EnqueueOptions {
  /** 消息类型 */
  messageType: OutboxMessageType;
  /** 消息载荷 */
  payload: Record<string, any>;
  /** 关联的聚合 ID */
  aggregateId?: string;
  /** 聚合类型 */
  aggregateType?: string;
  /** 幂等键 (可选，用于防重) */
  idempotencyKey?: string;
  /** 延迟执行时间 (秒) */
  delaySeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 消息处理结果
 */
export interface ProcessResult {
  success: boolean;
  error?: string;
  /** 是否应该重试 */
  retryable?: boolean;
}

/**
 * OutboxService - Outbox 模式核心服务
 *
 * 职责：
 * 1. 在事务中安全入队消息
 * 2. 提供消息获取接口给 Worker
 * 3. 管理消息状态转换
 * 4. 处理重试和死信
 *
 * 使用方式：
 * ```typescript
 * // 在业务事务中入队
 * await dataSource.transaction(async (manager) => {
 *   await businessRepo.save(entity);
 *   await outboxService.enqueue({
 *     messageType: 'PUSH_NOTIFICATION',
 *     payload: { ... },
 *     aggregateId: entity.id,
 *   }, manager);
 * });
 * ```
 */
@Injectable()
export class OutboxService {
  private readonly logger: NgLoggerService;

  constructor(
    @InjectRepository(NgOutbox)
    private readonly outboxRepo: Repository<NgOutbox>,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('OutboxService');
  }

  /**
   * 入队消息
   *
   * @param options 入队选项
   * @param manager 可选的事务 manager（推荐在事务中调用）
   */
  async enqueue(options: EnqueueOptions, manager?: EntityManager): Promise<NgOutbox> {
    const repo = manager ? manager.getRepository(NgOutbox) : this.outboxRepo;

    const now = this.clock.now();
    const scheduledAt = options.delaySeconds
      ? new Date(now.getTime() + options.delaySeconds * 1000)
      : now;

    const message = repo.create({
      messageType: options.messageType,
      status: 'PENDING',
      payload: options.payload,
      aggregateId: options.aggregateId ?? null,
      aggregateType: options.aggregateType ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      scheduledAt,
      maxRetries: options.maxRetries ?? 5,
      retryCount: 0,
    });

    await repo.save(message);

    this.logger.log('Message enqueued', {
      messageId: message.id,
      messageType: message.messageType,
      aggregateId: message.aggregateId,
    });

    return message;
  }

  /**
   * 批量入队消息
   */
  async enqueueBatch(
    optionsList: EnqueueOptions[],
    manager?: EntityManager,
  ): Promise<NgOutbox[]> {
    const repo = manager ? manager.getRepository(NgOutbox) : this.outboxRepo;
    const now = this.clock.now();

    const messages = optionsList.map((options) => {
      const scheduledAt = options.delaySeconds
        ? new Date(now.getTime() + options.delaySeconds * 1000)
        : now;

      return repo.create({
        messageType: options.messageType,
        status: 'PENDING',
        payload: options.payload,
        aggregateId: options.aggregateId ?? null,
        aggregateType: options.aggregateType ?? null,
        idempotencyKey: options.idempotencyKey ?? null,
        scheduledAt,
        maxRetries: options.maxRetries ?? 5,
        retryCount: 0,
      });
    });

    await repo.save(messages);

    this.logger.log('Messages enqueued in batch', {
      count: messages.length,
    });

    return messages;
  }

  /**
   * 获取待处理的消息
   *
   * 使用 SELECT ... FOR UPDATE SKIP LOCKED 实现并发安全
   */
  async fetchPendingMessages(
    limit: number = 10,
    messageTypes?: OutboxMessageType[],
  ): Promise<NgOutbox[]> {
    const now = this.clock.now();

    const qb = this.outboxRepo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: 'PENDING' })
      .andWhere('o.scheduledAt <= :now', { now })
      .orderBy('o.scheduledAt', 'ASC')
      .limit(limit)
      .setLock('pessimistic_write_or_fail'); // SKIP LOCKED

    if (messageTypes && messageTypes.length > 0) {
      qb.andWhere('o.messageType IN (:...types)', { types: messageTypes });
    }

    try {
      return await qb.getMany();
    } catch (error: any) {
      // 如果所有行都被锁定，返回空数组
      if (error.code === '55P03') {
        return [];
      }
      throw error;
    }
  }

  /**
   * 获取需要重试的消息
   */
  async fetchRetryableMessages(limit: number = 10): Promise<NgOutbox[]> {
    const now = this.clock.now();

    return this.outboxRepo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: 'FAILED' })
      .andWhere('o.retryCount < o.maxRetries')
      .andWhere('o.nextRetryAt <= :now', { now })
      .orderBy('o.nextRetryAt', 'ASC')
      .limit(limit)
      .setLock('pessimistic_write_or_fail')
      .getMany()
      .catch(() => []);
  }

  /**
   * 标记消息开始处理
   */
  async markProcessing(message: NgOutbox): Promise<void> {
    message.status = 'PROCESSING';
    message.startedAt = this.clock.now();
    await this.outboxRepo.save(message);
  }

  /**
   * 标记消息处理完成
   */
  async markCompleted(message: NgOutbox): Promise<void> {
    const now = this.clock.now();
    message.status = 'COMPLETED';
    message.completedAt = now;
    message.processingTimeMs = message.startedAt
      ? now.getTime() - message.startedAt.getTime()
      : null;
    await this.outboxRepo.save(message);

    this.logger.log('Message completed', {
      messageId: message.id,
      messageType: message.messageType,
      processingTimeMs: message.processingTimeMs,
    });
  }

  /**
   * 标记消息处理失败
   */
  async markFailed(message: NgOutbox, error: string, retryable: boolean = true): Promise<void> {
    message.lastError = error;
    message.retryCount += 1;

    if (!retryable || !message.canRetry()) {
      message.status = 'DEAD';
      this.logger.error('Message moved to dead letter', error, {
        messageId: message.id,
        messageType: message.messageType,
        retryCount: message.retryCount,
      });
    } else {
      message.status = 'FAILED';
      message.nextRetryAt = message.calculateNextRetry();
      this.logger.warn('Message failed, will retry', {
        messageId: message.id,
        messageType: message.messageType,
        retryCount: message.retryCount,
        nextRetryAt: message.nextRetryAt.toISOString(),
      });
    }

    await this.outboxRepo.save(message);
  }

  /**
   * 重置超时的 PROCESSING 消息
   *
   * 用于处理 Worker 崩溃的情况
   */
  async resetStaleProcessingMessages(timeoutMinutes: number = 10): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const result = await this.outboxRepo.update(
      {
        status: 'PROCESSING' as OutboxStatus,
        startedAt: LessThanOrEqual(cutoff),
      },
      {
        status: 'PENDING',
        startedAt: null,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.warn('Reset stale processing messages', {
        count: result.affected,
        timeoutMinutes,
      });
    }

    return result.affected ?? 0;
  }

  /**
   * 清理已完成的旧消息
   */
  async cleanupCompletedMessages(retentionDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.outboxRepo.delete({
      status: 'COMPLETED' as OutboxStatus,
      completedAt: LessThanOrEqual(cutoff),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log('Cleaned up completed messages', {
        count: result.affected,
        retentionDays,
      });
    }

    return result.affected ?? 0;
  }

  /**
   * 获取 Outbox 统计信息
   */
  async getStats(): Promise<Record<OutboxStatus, number>> {
    const result = await this.outboxRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();

    const stats: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      DEAD: 0,
    };

    for (const row of result) {
      stats[row.status] = parseInt(row.count, 10);
    }

    return stats as Record<OutboxStatus, number>;
  }
}

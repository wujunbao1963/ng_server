import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThan } from 'typeorm';
import { NgOutbox, OutboxStatus, OutboxMessageType } from './ng-outbox.entity';

export interface EnqueueOptions {
  /** 消息类型 */
  messageType: OutboxMessageType;
  /** 消息载荷 */
  payload: Record<string, any>;
  /** 关联聚合根 ID */
  aggregateId?: string;
  /** 关联聚合根类型 */
  aggregateType?: string;
  /** 幂等键（防止重复入队） */
  idempotencyKey?: string;
  /** 延迟执行时间 */
  scheduledAt?: Date;
  /** 最大重试次数（默认 5） */
  maxRetries?: number;
}

export interface OutboxStats {
  [OutboxStatus.PENDING]: number;
  [OutboxStatus.PROCESSING]: number;
  [OutboxStatus.COMPLETED]: number;
  [OutboxStatus.FAILED]: number;
  [OutboxStatus.DEAD]: number;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(NgOutbox)
    private readonly outboxRepo: Repository<NgOutbox>,
  ) {}

  /**
   * 入队消息
   * 
   * @param options 入队选项
   * @param manager 可选的事务管理器（用于和业务操作在同一事务）
   * @returns 创建的 Outbox 消息
   */
  async enqueue(options: EnqueueOptions, manager?: EntityManager): Promise<NgOutbox> {
    const repo = manager ? manager.getRepository(NgOutbox) : this.outboxRepo;

    // 检查幂等键
    if (options.idempotencyKey) {
      const existing = await repo.findOne({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existing) {
        this.logger.debug(`Duplicate message ignored: ${options.idempotencyKey}`);
        return existing;
      }
    }

    const message = repo.create({
      messageType: options.messageType,
      payload: options.payload,
      aggregateId: options.aggregateId,
      aggregateType: options.aggregateType,
      idempotencyKey: options.idempotencyKey,
      scheduledAt: options.scheduledAt ?? new Date(),
      maxRetries: options.maxRetries ?? 5,
      status: OutboxStatus.PENDING,
    });

    await repo.save(message);
    this.logger.debug(`Enqueued: ${message.toLogString()}`);
    return message;
  }

  /**
   * 获取待处理消息（使用 FOR UPDATE SKIP LOCKED 避免并发冲突）
   * 
   * @param batchSize 批量大小
   * @param messageTypes 消息类型过滤（可选）
   * @returns 待处理消息列表
   */
  async fetchPendingMessages(
    batchSize: number = 10,
    messageTypes?: OutboxMessageType[],
  ): Promise<NgOutbox[]> {
    const now = new Date();

    // 使用原生 SQL 实现 FOR UPDATE SKIP LOCKED
    const qb = this.outboxRepo
      .createQueryBuilder('outbox')
      .where('outbox.status = :pendingStatus', { pendingStatus: OutboxStatus.PENDING })
      .andWhere('outbox.scheduled_at <= :now', { now })
      .orderBy('outbox.scheduled_at', 'ASC')
      .limit(batchSize)
      .setLock('pessimistic_write_or_fail'); // FOR UPDATE SKIP LOCKED

    if (messageTypes && messageTypes.length > 0) {
      qb.andWhere('outbox.message_type IN (:...types)', { types: messageTypes });
    }

    try {
      // 获取并立即标记为 PROCESSING
      const messages = await qb.getMany();
      
      if (messages.length > 0) {
        const ids = messages.map(m => m.id);
        await this.outboxRepo
          .createQueryBuilder()
          .update(NgOutbox)
          .set({ 
            status: OutboxStatus.PROCESSING,
            startedAt: new Date(),
          })
          .whereInIds(ids)
          .execute();
        
        // 刷新状态
        for (const msg of messages) {
          msg.status = OutboxStatus.PROCESSING;
          msg.startedAt = new Date();
        }
      }

      return messages;
    } catch (error) {
      // SKIP LOCKED 时可能无消息可锁定
      this.logger.debug('No pending messages available or lock conflict');
      return [];
    }
  }

  /**
   * 标记消息处理完成
   */
  async markCompleted(message: NgOutbox): Promise<void> {
    const now = new Date();
    const processingTimeMs = message.startedAt 
      ? now.getTime() - message.startedAt.getTime() 
      : 0;

    await this.outboxRepo.update(message.id, {
      status: OutboxStatus.COMPLETED,
      completedAt: now,
      processingTimeMs,
    });

    this.logger.debug(`Completed: ${message.toLogString()} in ${processingTimeMs}ms`);
  }

  /**
   * 标记消息处理失败
   * 
   * @param message 消息
   * @param error 错误信息
   * @param nonRetryable 是否不可重试（直接进入死信）
   */
  async markFailed(message: NgOutbox, error: string, nonRetryable: boolean = false): Promise<void> {
    const newRetryCount = message.retryCount + 1;
    const canRetry = !nonRetryable && newRetryCount < message.maxRetries;

    if (canRetry) {
      // 计算下次重试时间
      message.retryCount = newRetryCount;
      const nextRetryAt = message.calculateNextRetryAt();

      await this.outboxRepo.update(message.id, {
        status: OutboxStatus.FAILED,
        retryCount: newRetryCount,
        lastError: error,
        nextRetryAt,
      });

      this.logger.warn(`Failed (will retry): ${message.toLogString()} error=${error}`);
    } else {
      // 进入死信
      await this.outboxRepo.update(message.id, {
        status: OutboxStatus.DEAD,
        retryCount: newRetryCount,
        lastError: error,
        completedAt: new Date(),
      });

      this.logger.error(`Dead letter: ${message.toLogString()} error=${error}`);
    }
  }

  /**
   * 重置 FAILED 状态的消息为 PENDING（到达重试时间后）
   */
  async resetFailedMessages(): Promise<number> {
    const now = new Date();

    const result = await this.outboxRepo
      .createQueryBuilder()
      .update(NgOutbox)
      .set({ status: OutboxStatus.PENDING })
      .where('status = :failedStatus', { failedStatus: OutboxStatus.FAILED })
      .andWhere('next_retry_at <= :now', { now })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Reset ${affected} failed messages for retry`);
    }

    return affected;
  }

  /**
   * 重置卡在 PROCESSING 状态超时的消息
   * 
   * @param timeoutMinutes 超时时间（分钟）
   */
  async resetStaleProcessingMessages(timeoutMinutes: number = 10): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const result = await this.outboxRepo
      .createQueryBuilder()
      .update(NgOutbox)
      .set({ status: OutboxStatus.PENDING })
      .where('status = :processingStatus', { processingStatus: OutboxStatus.PROCESSING })
      .andWhere('started_at < :cutoff', { cutoff })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.warn(`Reset ${affected} stale PROCESSING messages (timeout=${timeoutMinutes}min)`);
    }

    return affected;
  }

  /**
   * 清理已完成的旧消息
   * 
   * @param retentionDays 保留天数
   */
  async cleanupCompletedMessages(retentionDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.outboxRepo.delete({
      status: OutboxStatus.COMPLETED,
      completedAt: LessThan(cutoff),
    });

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Cleaned up ${affected} completed messages older than ${retentionDays} days`);
    }

    return affected;
  }

  /**
   * 获取 Outbox 统计信息
   */
  async getStats(): Promise<OutboxStats> {
    const results = await this.outboxRepo
      .createQueryBuilder('outbox')
      .select('outbox.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('outbox.status')
      .getRawMany();

    const stats: OutboxStats = {
      [OutboxStatus.PENDING]: 0,
      [OutboxStatus.PROCESSING]: 0,
      [OutboxStatus.COMPLETED]: 0,
      [OutboxStatus.FAILED]: 0,
      [OutboxStatus.DEAD]: 0,
    };

    for (const row of results) {
      stats[row.status as OutboxStatus] = parseInt(row.count, 10);
    }

    return stats;
  }

  /**
   * 按聚合根查询消息
   */
  async findByAggregate(aggregateType: string, aggregateId: string): Promise<NgOutbox[]> {
    return this.outboxRepo.find({
      where: { aggregateType, aggregateId },
      order: { createdAt: 'DESC' },
    });
  }
}

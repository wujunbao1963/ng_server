import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Outbox 消息状态
 */
export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD';

/**
 * Outbox 消息类型
 */
export type OutboxMessageType =
  | 'PUSH_NOTIFICATION'
  | 'EMAIL_NOTIFICATION'
  | 'WEBHOOK_CALL'
  | 'EVENT_SYNC';

/**
 * NgOutbox Entity - 可靠消息投递的核心表
 *
 * Outbox 模式确保：
 * 1. 消息与业务数据在同一事务中写入
 * 2. Worker 异步处理消息
 * 3. 失败自动重试
 * 4. 死信队列处理
 *
 * 使用方式：
 * 1. 在业务事务中调用 outboxService.enqueue()
 * 2. Worker 定期轮询 PENDING 消息
 * 3. 处理成功标记 COMPLETED，失败增加重试计数
 * 4. 超过最大重试次数移入 DEAD
 */
@Entity('ng_outbox')
@Index('idx_outbox_status_scheduled', ['status', 'scheduledAt'])
@Index('idx_outbox_type_status', ['messageType', 'status'])
export class NgOutbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 消息类型
   */
  @Column({ type: 'varchar', length: 50, name: 'message_type' })
  messageType!: OutboxMessageType;

  /**
   * 消息状态
   */
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status!: OutboxStatus;

  /**
   * 消息载荷 (JSON)
   */
  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  /**
   * 聚合 ID (用于关联业务实体)
   * 例如: notificationId, eventId
   */
  @Column({ type: 'varchar', length: 100, name: 'aggregate_id', nullable: true })
  aggregateId!: string | null;

  /**
   * 聚合类型
   * 例如: 'Notification', 'Event'
   */
  @Column({ type: 'varchar', length: 50, name: 'aggregate_type', nullable: true })
  aggregateType!: string | null;

  /**
   * 幂等键 (防止重复处理)
   */
  @Column({ type: 'varchar', length: 255, name: 'idempotency_key', nullable: true, unique: true })
  idempotencyKey!: string | null;

  /**
   * 计划执行时间 (支持延迟消息)
   */
  @Column({ type: 'timestamptz', name: 'scheduled_at', default: () => 'NOW()' })
  scheduledAt!: Date;

  /**
   * 重试次数
   */
  @Column({ type: 'int', name: 'retry_count', default: 0 })
  retryCount!: number;

  /**
   * 最大重试次数
   */
  @Column({ type: 'int', name: 'max_retries', default: 5 })
  maxRetries!: number;

  /**
   * 下次重试时间
   */
  @Column({ type: 'timestamptz', name: 'next_retry_at', nullable: true })
  nextRetryAt!: Date | null;

  /**
   * 最后错误信息
   */
  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null;

  /**
   * 处理开始时间 (用于检测超时)
   */
  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  /**
   * 处理完成时间
   */
  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt!: Date | null;

  /**
   * 处理耗时 (毫秒)
   */
  @Column({ type: 'int', name: 'processing_time_ms', nullable: true })
  processingTimeMs!: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /**
   * 计算下次重试时间 (指数退避)
   * 1分钟, 5分钟, 25分钟, 2小时, 10小时
   */
  calculateNextRetry(): Date {
    const baseDelayMs = 60 * 1000; // 1 minute
    const multiplier = Math.pow(5, this.retryCount);
    const delayMs = Math.min(baseDelayMs * multiplier, 10 * 60 * 60 * 1000); // max 10 hours
    return new Date(Date.now() + delayMs);
  }

  /**
   * 是否可以重试
   */
  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }
}

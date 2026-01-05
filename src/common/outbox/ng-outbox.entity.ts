import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Outbox 消息类型
 */
export enum OutboxMessageType {
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICATION',
  WEBHOOK_DELIVERY = 'WEBHOOK_DELIVERY',
}

/**
 * Outbox 消息状态
 */
export enum OutboxStatus {
  /** 待处理 */
  PENDING = 'PENDING',
  /** 处理中 */
  PROCESSING = 'PROCESSING',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 失败（可重试） */
  FAILED = 'FAILED',
  /** 死信（超过最大重试次数） */
  DEAD = 'DEAD',
}

/**
 * Outbox 消息实体
 * 
 * 用途：
 * 1. 保证业务操作和消息发送的原子性
 * 2. 支持失败重试和死信处理
 * 3. 提供消息追踪和审计
 * 
 * 生命周期：
 * PENDING → PROCESSING → COMPLETED
 *                     → FAILED → (retry) → PENDING
 *                              → (max retries) → DEAD
 */
@Entity('ng_outbox')
@Index('idx_outbox_status_scheduled', ['status', 'scheduledAt'])
@Index('idx_outbox_type_status', ['messageType', 'status'])
@Index('idx_outbox_aggregate', ['aggregateType', 'aggregateId'])
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
  @Column({
    type: 'varchar',
    length: 20,
    default: OutboxStatus.PENDING,
  })
  status!: OutboxStatus;

  /**
   * 消息载荷 (JSON)
   */
  @Column({ type: 'jsonb' })
  payload!: Record<string, any>;

  /**
   * 关联聚合根 ID（用于查询和关联）
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'aggregate_id' })
  aggregateId?: string;

  /**
   * 关联聚合根类型
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'aggregate_type' })
  aggregateType?: string;

  /**
   * 幂等键（确保消息不重复处理）
   */
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true, name: 'idempotency_key' })
  idempotencyKey?: string;

  /**
   * 计划执行时间（支持延迟消息）
   */
  @Column({ type: 'timestamptz', default: () => 'NOW()', name: 'scheduled_at' })
  scheduledAt!: Date;

  /**
   * 当前重试次数
   */
  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount!: number;

  /**
   * 最大重试次数
   */
  @Column({ type: 'int', default: 5, name: 'max_retries' })
  maxRetries!: number;

  /**
   * 下次重试时间
   */
  @Column({ type: 'timestamptz', nullable: true, name: 'next_retry_at' })
  nextRetryAt?: Date;

  /**
   * 最后一次错误信息
   */
  @Column({ type: 'text', nullable: true, name: 'last_error' })
  lastError?: string;

  /**
   * 开始处理时间
   */
  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt?: Date;

  /**
   * 完成时间
   */
  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  /**
   * 处理耗时（毫秒）
   */
  @Column({ type: 'int', nullable: true, name: 'processing_time_ms' })
  processingTimeMs?: number;

  /**
   * 创建时间
   */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /**
   * 计算下次重试时间（指数退避）
   * 
   * 策略：
   * - Retry 1: 1 分钟
   * - Retry 2: 5 分钟
   * - Retry 3: 25 分钟
   * - Retry 4: 2 小时 5 分钟
   * - Retry 5: 10 小时 25 分钟
   */
  calculateNextRetryAt(): Date {
    const baseDelayMs = 60 * 1000; // 1 minute
    const multiplier = Math.pow(5, this.retryCount);
    const delayMs = baseDelayMs * multiplier;
    return new Date(Date.now() + delayMs);
  }

  /**
   * 是否可以重试
   */
  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  /**
   * 转换为日志友好格式
   */
  toLogString(): string {
    return `Outbox[${this.id}] type=${this.messageType} status=${this.status} retry=${this.retryCount}/${this.maxRetries}`;
  }
}
